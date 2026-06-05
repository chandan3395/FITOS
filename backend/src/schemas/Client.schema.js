"use strict";

const mongoose = require("mongoose");

const CLIENT_STATUSES = ["ACTIVE", "ARCHIVED"];
const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];

const clientSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: GENDER_OPTIONS,
    },
    age: {
      type: Number,
      min: 1,
      max: 120,
    },
    city: {
      type: String,
      trim: true,
    },
    height: {
      type: Number,
    },
    startingWeight: {
      type: Number,
    },
    targetWeight: {
      type: Number,
    },
    goal: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: CLIENT_STATUSES,
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

// Primary access pattern: "all clients belonging to trainer X"
clientSchema.index({ trainerId: 1 });

// Most common filtered query: "all ACTIVE clients for trainer X"
clientSchema.index({ trainerId: 1, status: 1 });

const Client = mongoose.model("Client", clientSchema);

module.exports = { Client, CLIENT_STATUSES, GENDER_OPTIONS };
