export default {
  async fetch(req, env) {
    const UPSTREAM = "https://www.gamersberg.com/api/v1/blox-fruits/stock";
    const now = Date.now();

    let cached = await env.STOCK_KV.get("state", { type: "json" });

    try {
      const res = await fetch(UPSTREAM, {
        headers: { "user-agent": "Mozilla/5.0" }
      });

      if (!res.ok) throw new Error("Upstream failed");

      const json = await res.json();
      if (!json?.success || !json?.data) throw new Error("Bad data");

      let normal = [];
      let mirage = [];

      for (const block of json.data) {
        block.normalStock?.forEach(f =>
          normal.push({ name: f.name, price: f.price })
        );
        block.mirageStock?.forEach(f =>
          mirage.push({ name: f.name, price: f.price })
        );
      }

      const uniq = arr =>
        Object.values(arr.reduce((o, f) => {
          o[f.name] = f;
          return o;
        }, {}));

      normal = uniq(normal);
      mirage = uniq(mirage);

      const hash = JSON.stringify({ normal, mirage });

      if (!cached || cached.hash !== hash) {
        cached = {
          hash,
          lastUpdate: now,
          stock: { normal, mirage }
        };
        await env.STOCK_KV.put("state", JSON.stringify(cached));
      }
    } catch {
      if (!cached) {
        return new Response(JSON.stringify({ ok: false }), { status: 500 });
      }
    }

    const last = cached.lastUpdate;

    return new Response(JSON.stringify({
      ok: true,
      lastUpdate: last,
      nextRefresh: {
        normal: last + 4 * 60 * 60 * 1000,
        mirage: last + 2 * 60 * 60 * 1000
      },
      stock: cached.stock
    }), {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    });
  }
};
