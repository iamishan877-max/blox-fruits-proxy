export default {
  async fetch(request, env) {
    try {
      const cached = await env.STOCK_KV.get("stock", { type: "json" });
      if (cached) {
        return json({
          ok: true,
          source: "cache",
          stock: cached
        });
      }

      const res = await fetch(
        "https://www.gamersberg.com/api/blox-fruits/stock",
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
          },
          cf: {
            cacheTtl: 0,
            cacheEverything: false
          }
        }
      );

      if (!res.ok) {
        throw new Error("Upstream fetch failed");
      }

      const data = await res.json();

      const stock = {
        normal: data?.normalStock || [],
        mirage: data?.mirageStock || []
      };

      await env.STOCK_KV.put(
        "stock",
        JSON.stringify(stock),
        { expirationTtl: 300 } // 5 minutes
      );

      return json({
        ok: true,
        source: "live",
        stock
      });

    } catch (err) {
      return json({
        ok: false,
        reason: err.message || "unknown"
      });
    }
  }
};

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
}

