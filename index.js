const express = require("express");
const app = express();
app.use(express.json());

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

async function placeTrade(symbol, side, notional) {
  const formattedSymbol = formatSymbol(symbol);
  const url = `${ALPACA_BASE_URL}/v2/orders`;
  const body = {
    symbol:        formattedSymbol,
    side:          side,
    type:          "market",
    time_in_force: "gtc",
    notional:      String(notional)
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

async function getPosition(symbol) {
  // Try both formats - with and without slash
  const symbols = [
    symbol,                              // BTCUSD
    formatSymbol(symbol),               // BTC/USD
    encodeURIComponent(formatSymbol(symbol)) // BTC%2FUSD
  ];

  for (const sym of symbols) {
    const url = `${ALPACA_BASE_URL}/v2/positions/${sym}`;
    console.log("Trying position URL:", url);

    const response = await fetch(url, {
      method:  "GET",
      headers: {
        "APCA-API-KEY-ID":     ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
      }
    });

    if (response.status === 200) {
      const data = await response.json();
      console.log("Position found with symbol:", sym);
      return data;
    }
  }

  console.log("No position found for:", symbol);
  return null;
}

async function closeTrade(symbol) {
  const formattedSymbol = formatSymbol(symbol);
  console.log("Getting position for:", formattedSymbol);

  // First get the current position
  const position = await getPosition(symbol);

  // No position to close
  if (!position) {
    console.log("No position found for:", formattedSymbol);
    return { message: "No position to close" };
  }

  console.log("Position found:", JSON.stringify(position));

  // Get exact quantity owned
  const qty = position.qty;
  const side = position.side === "long" ? "sell" : "buy";

  console.log(`Closing ${side} position of ${qty} ${formattedSymbol}`);

  // Place order with exact quantity
  const url = `${ALPACA_BASE_URL}/v2/orders`;
  const body = {
    symbol:        formattedSymbol,
    qty:           String(qty),
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
  console.log("Close response:", JSON.stringify(data));
  return data;
}

app.post("/webhook", async (req, res) => {
  const { signal, symbol, notional } = req.body;
  console.log("Signal received:", JSON.stringify(req.body));

  try {
    if (signal === "BUY") {
      const result = await placeTrade(symbol, "buy", notional || 1000);
      res.json({ status: "BUY order placed", symbol, result });

    } else if (signal === "SELL") {
      console.log("SELL signal — closing position for:", symbol);
      const result = await closeTrade(symbol);
      res.json({ status: "Position closed on SELL", symbol, result });

    } else if (signal === "EXIT") {
      console.log("EXIT signal — closing position for:", symbol);
      const result = await closeTrade(symbol);
      res.json({ status: "Position closed on EXIT", symbol, result });

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
// Check all positions
app.get("/positions", async (req, res) => {
  const url = `${ALPACA_BASE_URL}/v2/positions`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "APCA-API-KEY-ID":     ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
    }
  });
  const data = await response.json();
  console.log("Positions:", JSON.stringify(data));
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Trading bot running on port ${PORT}`);
});
