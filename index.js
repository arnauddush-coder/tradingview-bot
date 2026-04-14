const express = require("express");
const app = express();
app.use(express.json());

// Your Alpaca API credentials
const ALPACA_API_KEY    = process.env.ALPACA_API_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
console.log("API Key loaded:", ALPACA_API_KEY ? "YES" : "NO");
console.log("Secret Key loaded:", ALPACA_SECRET_KEY ? "YES" : "NO");
const ALPACA_BASE_URL   = "https://paper-api.alpaca.markets";

// Function to place trade on Alpaca
async function placeTrade(symbol, side, qty) {
  const url = `${ALPACA_BASE_URL}/v2/orders`;
  const body = {
    symbol:        symbol,
    qty:           qty,
    side:          side,
    type:          "market",
    time_in_force: "gtc"
  };

  const response = await fetch(url, {
    method:  "POST",
    headers: {
      "APCA-API-KEY-ID":     ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
      "Content-Type":        "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  console.log("Trade placed:", data);
  return data;
}

// Function to close trade on Alpaca
async function closeTrade(symbol) {
  const url = `${ALPACA_BASE_URL}/v2/positions/${symbol}`;

  const response = await fetch(url, {
    method:  "DELETE",
    headers: {
      "APCA-API-KEY-ID":     ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
    }
  });

  const data = await response.json();
  console.log("Trade closed:", data);
  return data;
}

// Webhook endpoint — receives signals from TradingView
app.post("/webhook", async (req, res) => {
  const { signal, symbol, qty } = req.body;

  console.log("Signal received:", req.body);

  try {
    if (signal === "BUY") {
      await placeTrade(symbol, "buy", qty || 1);
      res.json({ status: "BUY order placed", symbol });

    } else if (signal === "SELL") {
      await placeTrade(symbol, "sell", qty || 1);
      res.json({ status: "SELL order placed", symbol });

    } else if (signal === "EXIT") {
      await closeTrade(symbol);
      res.json({ status: "Position closed", symbol });

    } else {
      res.json({ status: "Unknown signal", signal });
    }

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Trading bot is running!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Trading bot running on port ${PORT}`);
});
