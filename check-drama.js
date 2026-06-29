const { PrismaClient } = require("@prisma/client");
(async () => {
  const d = new PrismaClient();
  const c = await d.content.findUnique({
    where: { id: "cmqxrqlvq00b6u53uv4tbul9j" },
    select: { providerName: true, providerSlug: true, clipkuContentId: true, title: true }
  });
  console.log(JSON.stringify(c, null, 2));
  await d.$disconnect();
})();
