"use strict";

const getHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    message: "FITOS backend running",
  });
};

module.exports = { getHealth };
