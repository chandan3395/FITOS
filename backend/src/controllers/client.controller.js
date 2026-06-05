"use strict";

const clientService = require("../services/client.service");
const ApiResponse = require("../utils/ApiResponse");

async function createClient(req, res, next) {
  try {
    const client = await clientService.createClient(req.user, req.body);
    return ApiResponse.created(res, "Client created successfully", client);
  } catch (err) {
    next(err);
  }
}

module.exports = { createClient };
