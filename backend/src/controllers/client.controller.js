"use strict";

const clientService = require("../services/client.service");
const ApiResponse = require("../utils/ApiResponse");

async function createClient(req, res, next) {
  try {
    const { client, invite } = await clientService.createClient(req.user, req.body);
    return ApiResponse.created(res, "Client created successfully", { client, invite });
  } catch (err) {
    next(err);
  }
}

async function listClients(req, res, next) {
  try {
    const clients = await clientService.listClientsForTrainer(req.user);
    return ApiResponse.ok(res, "Clients fetched successfully", { clients });
  } catch (err) {
    next(err);
  }
}

async function getClient(req, res, next) {
  try {
    const client = await clientService.getClientForTrainer(req.params.id, req.user);
    return ApiResponse.ok(res, "Client fetched successfully", { client });
  } catch (err) {
    next(err);
  }
}

async function updateClient(req, res, next) {
  try {
    const client = await clientService.updateClient(req.params.id, req.user, req.body);
    return ApiResponse.ok(res, "Client updated successfully", { client });
  } catch (err) {
    next(err);
  }
}

async function sendInvite(req, res, next) {
  try {
    const result = await clientService.sendWhatsAppInvite(req.params.id, req.user);
    return ApiResponse.ok(res, "WhatsApp invite sent", result);
  } catch (err) {
    next(err);
  }
}

module.exports = { createClient, listClients, getClient, updateClient, sendInvite };
