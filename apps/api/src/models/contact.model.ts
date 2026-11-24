import { Schema, Types, model } from "mongoose";

export interface IContact {
  user_id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  tags: string[];
  favorite: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>({
  user_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
    index: true,
  },
  firstName: { type: String, required: [true, "Please add the contact first name"], trim: true },
  lastName: { type: String, default: "", trim: true },
  email: { type: String, default: "", trim: true, lowercase: true },
  phone: { type: String, default: "", trim: true },
  company: { type: String, default: "", trim: true },
  jobTitle: { type: String, default: "", trim: true },
  tags: { type: [String], default: [] },
  favorite: { type: Boolean, default: false },
  notes: { type: String, default: "" },
}, {
  timestamps: true,
  toJSON: {
    // Expose `id` and hide Mongo internals and the owner reference.
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      delete ret.user_id;
      return ret;
    },
  },
});

export default model<IContact>("Contact", contactSchema);
