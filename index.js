const express = require("express");
const app = express();
app.use(express.json());

// Keys loaded from Railway environment variables
const ALPACA_API_KEY    = process.env.ALPACA_API_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const ALPACA_BASE_URL   = "https://paper-api.alpaca.markets";

console.log("Starting bot...");
console.log("API Key loaded:", ALPACA_API_KEY ? "YES" : "NO");
console.log("Secret Key loaded:", ALPACA_SECRET_KEY ? "YES" : "NO");

function formatSymbol(symbol) {
  const cryptoSymbols = ["BTCUSD", "ETHUSD"];
  if (cryptoSymbols.includes(symbol)) {
    return symbol.replace("USD", "/USD");
  }
  return symbol;
}

async function placeTrade(symbol, side, qty) {
  const formattedSymbol = formatSymbol(symbol);
  const url = `${ALPACA_BASE_URL}/v2/orders`;
  const body = {
    symbol:        formattedSymbol,
    qty:           String(qty),
    side:          side,
    type:          "market",
    time_in_force: "gtc"
  };

  console.log("Placing trade:", JSON.stringify(body));

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
  console.log("Trade response:", JSON.stringify(data));
  return data;
}

async function closeTrade(symbol) {
  const formattedSymbol = formatSymbol(symbol);
  const encodedSymbol   = encodeURIComponent(formattedSymbol);
  const url = `${ALPACA_BASE_URL}/v2/positions/${encodedSymbol}`;

  console.log("Closing position:", formattedSymbol);

  const response = await fetch(url, {
    method:  "DELETE",
    headers: {
      "APCA-API-KEY-ID":     ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
    }
  });

  const data = await response.json();
  console.log("Close response:", JSON.stringify(data));
  return data;
}

app.post("/webhook", async (req, res) => {
  const { signal, symbol, qty } = req.body;
  console.log("Signal received:", JSON.stringify(req.body));

  try {
    if (signal === "BUY") {
      const result = await placeTrade(symbol, "buy", qty || 1);
      res.json({ status: "BUY order placed", symbol, result });

    } else if (signal === "SELL") {
      const result = await placeTrade(symbol, "sell", qty || 1);
      res.json({ status: "SELL order placed", symbol, result });

    } else if (signal === "EXIT") {
      const result = await closeTrade(symbol);
      res.json({ status: "Position closed", symbol, result });

    } else {
      res.json({ status: "Unknown signal", signal });
    }

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "Trading bot is running!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Trading bot running on port ${PORT}`);
});
