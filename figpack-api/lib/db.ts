import mongoose, { Document, Model } from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

const MONGODB_URI = process.env.MONGODB_URI;

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = global as { mongoose?: CachedConnection };
const cached = globalWithMongoose.mongoose || { conn: null, promise: null };
globalWithMongoose.mongoose = cached;

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Figure interface
export interface IFigure {
  figureUrl: string; // URL to access the figure
  bucket?: string; // Bucket name where the figure is stored
  status: "uploading" | "completed" | "failed";
  ownerEmail: string; // From API key validation
  uploadStarted: number; // Unix timestamp
  uploadUpdated: number; // Unix timestamp
  uploadCompleted?: number; // Unix timestamp (optional)
  expiration: number; // Unix timestamp
  figpackVersion: string;
  totalFiles?: number;
  totalSize?: number;
  uploadProgress?: string;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  pinned?: boolean; // Whether the figure is pinned
  title?: string; // Optional title for the figure
  pinInfo?: {
    // Information for pinned figures
    name: string;
    figureDescription: string;
    pinnedTimestamp: number;
  };
  renewalTimestamp?: number; // When the figure was last renewed
  figureManagementUrl?: string; // e.g., https://manage.figpack.org/figure
  channel?: string; // "default" or "ephemeral"
  isEphemeral?: boolean; // Whether this is an ephemeral figure
}

export interface IFigureDocument extends IFigure, Document {}

// Figure schema
const figureSchema = new mongoose.Schema<IFigureDocument>({
  figureUrl: {
    type: String,
    required: true,
    unique: true,
  },
  bucket: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: ["uploading", "completed", "failed"],
    default: "uploading",
  },
  ownerEmail: {
    type: String,
    required: true,
  },
  uploadStarted: {
    type: Number,
    required: true,
  },
  uploadUpdated: {
    type: Number,
    required: true,
  },
  uploadCompleted: {
    type: Number,
  },
  expiration: {
    type: Number,
    required: true,
  },
  figpackVersion: {
    type: String,
    required: true,
  },
  totalFiles: {
    type: Number,
  },
  totalSize: {
    type: Number,
  },
  uploadProgress: {
    type: String,
  },
  createdAt: {
    type: Number,
    default: Date.now,
  },
  updatedAt: {
    type: Number,
    default: Date.now,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
  },
  pinInfo: {
    name: String,
    figureDescription: String,
    pinnedTimestamp: Number,
  },
  renewalTimestamp: Number,
  figureManagementUrl: {
    type: String,
    required: false,
  },
  channel: {
    type: String,
    enum: ["default", "ephemeral"],
    default: "default",
  },
  isEphemeral: {
    type: Boolean,
    default: false,
  },
});

// Update the updatedAt field on save
figureSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for fast lookups
figureSchema.index({ figureUrl: 1 }, { unique: true });
figureSchema.index({ bucket: 1 });
figureSchema.index({ ownerEmail: 1 });
figureSchema.index({ status: 1 });
figureSchema.index({ expiration: 1 });

export const Figure: Model<IFigureDocument> =
  mongoose.models.Figure || mongoose.model("Figure", figureSchema);

// User interface
export interface IUser {
  email: string; // Primary identifier (unique)
  name: string;
  researchDescription: string;
  apiKey: string; // Unique API key
  isAdmin: boolean;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

export interface IUserDocument extends IUser, Document {}

// User schema
const userSchema = new mongoose.Schema<IUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: "Invalid email format",
    },
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
  },
  researchDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
    minlength: 32,
  },
  isAdmin: {
    type: Boolean,
    required: true,
    default: false,
  },
  createdAt: {
    type: Number,
    default: Date.now,
  },
  updatedAt: {
    type: Number,
    default: Date.now,
  },
});

// Update the updatedAt field on save
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for fast lookups
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ apiKey: 1 }, { unique: true });
userSchema.index({ isAdmin: 1 });

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model("User", userSchema);

// Bucket interface
export interface IBucket {
  name: string; // Bucket name (e.g., "my-figpack-bucket")
  provider: "cloudflare" | "aws"; // Provider type
  description: string; // Human-readable description
  bucketBaseUrl: string; // Base URL for accessing objects in the bucket
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  credentials: {
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    S3_ENDPOINT: string;
  };
  authorization: {
    isPublic: boolean; // If true, any user can upload to this bucket
    authorizedUsers: string[]; // Array of email addresses allowed to upload (only used if isPublic is false)
  };
}

export interface IBucketDocument extends IBucket, Document {}

// Bucket schema
const bucketSchema = new mongoose.Schema<IBucketDocument>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
    validate: {
      validator: function (name: string) {
        // Bucket names should follow S3 naming conventions
        return /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(name) && name.length >= 3;
      },
      message:
        "Invalid bucket name format. Must be 3-100 characters, lowercase letters, numbers, and hyphens only.",
    },
  },
  provider: {
    type: String,
    enum: ["cloudflare", "aws"],
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  bucketBaseUrl: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (url: string) {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: "Invalid bucket base URL format",
    },
  },
  createdAt: {
    type: Number,
    default: Date.now,
  },
  updatedAt: {
    type: Number,
    default: Date.now,
  },
  credentials: {
    AWS_ACCESS_KEY_ID: {
      type: String,
      required: true,
      trim: true,
    },
    AWS_SECRET_ACCESS_KEY: {
      type: String,
      required: true,
      trim: true,
    },
    S3_ENDPOINT: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (endpoint: string) {
          try {
            new URL(endpoint);
            return true;
          } catch {
            return false;
          }
        },
        message: "Invalid S3 endpoint URL format",
      },
    },
  },
  authorization: {
    isPublic: {
      type: Boolean,
      required: true,
      default: false,
    },
    authorizedUsers: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator: function (users: string[]) {
          // Validate that all entries are valid email addresses
          return users.every((email) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          );
        },
        message: "All authorized users must be valid email addresses",
      },
    },
  },
});

// Update the updatedAt field on save
bucketSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for fast lookups
bucketSchema.index({ name: 1 }, { unique: true });
bucketSchema.index({ provider: 1 });
bucketSchema.index({ createdAt: 1 });

export const Bucket: Model<IBucketDocument> =
  mongoose.models.Bucket || mongoose.model("Bucket", bucketSchema);

export default connectDB;
