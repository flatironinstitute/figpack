import mongoose, { Document, Model } from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
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
  figureUrl: string;         // URL to access the figure
  status: 'uploading' | 'completed' | 'failed';
  ownerEmail: string;         // From API key validation
  uploadStarted: number;      // Unix timestamp
  uploadUpdated: number;      // Unix timestamp
  uploadCompleted?: number;   // Unix timestamp (optional)
  expiration: number;         // Unix timestamp
  figpackVersion: string;
  totalFiles?: number;
  totalSize?: number;
  uploadProgress?: string;
  createdAt: number;          // Unix timestamp
  updatedAt: number;          // Unix timestamp
  pinned?: boolean;           // Whether the figure is pinned
  pinInfo?: {                 // Information for pinned figures
    name: string;
    figureDescription: string;
    pinnedTimestamp: number;
  };
  renewalTimestamp?: number;  // When the figure was last renewed
}

export interface IFigureDocument extends IFigure, Document {}

// Figure schema
// Figure schema
const figureSchema = new mongoose.Schema<IFigureDocument>({
  figureUrl: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['uploading', 'completed', 'failed'],
    default: 'uploading'
  },
  ownerEmail: {
    type: String,
    required: true
  },
  uploadStarted: {
    type: Number,
    required: true
  },
  uploadUpdated: {
    type: Number,
    required: true
  },
  uploadCompleted: {
    type: Number
  },
  expiration: {
    type: Number,
    required: true
  },
  figpackVersion: {
    type: String,
    required: true
  },
  totalFiles: {
    type: Number
  },
  totalSize: {
    type: Number
  },
  uploadProgress: {
    type: String
  },
  createdAt: {
    type: Number,
    default: Date.now
  },
  updatedAt: {
    type: Number,
    default: Date.now
  },
  pinned: {
    type: Boolean,
    default: false
  },
  pinInfo: {
    name: String,
    figureDescription: String,
    pinnedTimestamp: Number
  },
  renewalTimestamp: Number
});

// Update the updatedAt field on save
figureSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for fast lookups
figureSchema.index({ figureUrl: 1 }, { unique: true });
figureSchema.index({ ownerEmail: 1 });
figureSchema.index({ status: 1 });
figureSchema.index({ expiration: 1 });

export const Figure: Model<IFigureDocument> = mongoose.models.Figure || mongoose.model('Figure', figureSchema);

// User interface
export interface IUser {
  email: string;              // Primary identifier (unique)
  name: string;
  researchDescription: string;
  apiKey: string;             // Unique API key
  isAdmin: boolean;
  createdAt: number;          // Unix timestamp
  updatedAt: number;          // Unix timestamp
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
      validator: function(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  researchDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
    minlength: 32
  },
  isAdmin: {
    type: Boolean,
    required: true,
    default: false
  },
  createdAt: {
    type: Number,
    default: Date.now
  },
  updatedAt: {
    type: Number,
    default: Date.now
  }
});

// Update the updatedAt field on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for fast lookups
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ apiKey: 1 }, { unique: true });
userSchema.index({ isAdmin: 1 });

export const User: Model<IUserDocument> = mongoose.models.User || mongoose.model('User', userSchema);

export default connectDB;
