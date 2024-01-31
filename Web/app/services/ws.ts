export type Message = {
	op: OpCode;
	to: Entity;
	from: Entity;
} & (
	| {
			data: HelloData;
			op: OpCode.HELLO;
	  }
	| {
			data: null;
			op: OpCode.REGISTER;
	  }
	| {
			data: ErrorData;
			op: OpCode.ERROR;
	  }
	| {
			data: null;
			op: OpCode.PING;
	  }
	| {
			data: null;
			op: OpCode.PONG;
	  }
	| {
			data: InstructionData;
			op: OpCode.INSTRUCTION;
	  }
	| {
			data: ExecuteData;
			op: OpCode.EXECUTE;
	  }
	| {
			data: string;
			op: OpCode.DONE;
	  }
	| {
			data: UpdateData;
			op: OpCode.UPDATE;
	  }
);

export type HelloData = {
	name: string;
	os: string;
};

export type ExecuteData = {
	type: InstructionType;
	value: string;
	id: string; // UUID created by the WEB client
};

export type UpdateData = {
	type: UpdateType;
} & {
	type: UpdateType.COMPUTER_STATUS;
	data: {
		name: Entity;
		online: boolean;
		os?: string;
		lastSeen: Date;
	};
};

export enum UpdateType {
	COMPUTER_STATUS = 0,
}

export type InstructionData = {
	to: Entity;
} & ExecuteData;

export enum InstructionType {
	TEXT = 0,
	SHELL = 1,
}

export type ErrorData = {
	message: string;
};

export enum OpCode {
	HELLO = 0,
	REGISTER = 1,
	ERROR = 2,
	// READY = 3, DEPRECATED - DO NOT USE
	PING = 4,
	PONG = 5,
	INSTRUCTION = 6,
	EXECUTE = 7,
	DONE = 8,
	UPDATE = 9, // FOR WEB USE ONLY
}

export enum ConnectionState {
	CONNECTED = 0,
	REGISTERED = 1,
	// READY = 2, DEPRECATED - DO NOT USE
}

export type Entity = 'WSS' | 'Web' | string;

export type Id = string;
