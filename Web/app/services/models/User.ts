import { model, Schema, models } from 'mongoose';
const ModelName = 'User';

export interface UserInterface extends Schema {
	id: string;
	permitted: boolean;
}

export let _interface: UserInterface;

const _schema = new Schema<typeof _interface>(
	{
		id: { type: String, required: true, unique: true },
		permitted: { type: Boolean, required: true, default: false },
	},
	{
		timestamps: true,
	}
);

export const User = models[ModelName] || model<typeof _interface>(ModelName, _schema);
