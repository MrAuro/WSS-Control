import { model, Schema, models } from 'mongoose';
const ModelName = 'Computer';

export interface ComputerInterface extends Schema {
	// System Name
	name: string;
	// OS Name
	os: string;
	// Is the computer connected to the WSS?
	online: boolean;
	// When was the last time the computer closed the connection?
	lastSeen: Date;
	// Ip address of the computer
	ip: string;
}

export let _interface: ComputerInterface;

const _schema = new Schema<typeof _interface>(
	{
		name: {
			type: String,
			required: true,
		},
		os: {
			type: String,
			required: true,
		},
		online: {
			type: Boolean,
			required: true,
		},
		lastSeen: {
			type: Date,
			required: true,
		},
		ip: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

export const Computer = models[ModelName] || model<typeof _interface>(ModelName, _schema);
