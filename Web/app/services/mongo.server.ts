import { connect } from 'mongoose';
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
	throw new Error('MongoDB connection string is missing. Set the environment variable MONGO_URI.');
}

const globalAny: any = global;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = globalAny.mongoose;

if (!cached) {
	cached = globalAny.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
	if (cached.conn) {
		return cached.conn;
	}

	if (!cached.promise) {
		cached.promise = connect(MONGO_URI as string).then((mongoose) => {
			return mongoose;
		});
	}
	cached.conn = await cached.promise;
	return cached.conn;
}

export default dbConnect;
