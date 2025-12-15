import mongoose from 'mongoose';

const systemStatusSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['healthy', 'degraded', 'unhealthy'],
      required: true,
      index: true,
    },
    uptime: {
      type: Number,
      required: true,
    },
    environment: {
      type: String,
      required: true,
      index: true,
    },
    version: {
      type: String,
      required: true,
    },
    responseTime: {
      type: Number,
      required: true,
      index: true,
    },
    memory: {
      used: { type: Number, required: true },
      total: { type: Number, required: true },
      external: { type: Number, required: true },
      rss: { type: Number, required: true },
    },
    cpu: {
      user: { type: Number },
      system: { type: Number },
    },
    databases: {
      postgresql: {
        write: { type: Boolean, required: true },
        read: { type: Boolean, required: true },
        writeLatency: { type: Number },
        readLatency: { type: Number },
      },
      mongodb: {
        connected: { type: Boolean, required: true },
        latency: { type: Number },
      },
      redis: {
        connected: { type: Boolean, required: true },
        latency: { type: Number },
      },
      errors: [{ type: String }],
    },
    nodeInfo: {
      nodeVersion: { type: String },
      platform: { type: String },
      arch: { type: String },
      pid: { type: Number },
    },
    requestId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'system-status',
  }
);

systemStatusSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
systemStatusSchema.index({ timestamp: -1, status: 1 });
systemStatusSchema.index({ environment: 1, timestamp: -1 });
systemStatusSchema.index({ status: 1, timestamp: -1 });
systemStatusSchema.index({ 'databases.postgresql.write': 1, timestamp: -1 });
systemStatusSchema.index({ responseTime: 1, timestamp: -1 });

const SystemStatus = mongoose.model('SystemStatus', systemStatusSchema);

export default SystemStatus;
