import Koa from "koa";
import Router from "koa-router";

const app = new Koa();
const router = new Router();

router.get("/health", (ctx) => {
  ctx.body = { ok: true };
});

// 架构占位：后续在这里接入 a2ui agent / 协议生成与缓存
router.post("/api/a2ui/generate", async (ctx) => {
  void ctx;
  ctx.status = 501;
  ctx.body = { error: "Not implemented (scaffold only)" };
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[a2ui-playground-server] listening on http://localhost:${port}`);
});

