const { PrismaClient } = require("@prisma/client");
(async () => {
  const d = new PrismaClient();
  const eps = await d.apiEndpoint.findMany({
    where: { providerSlug: { in: ["moviebox", "drama"] } }
  });
  console.log("MovieBox:", eps.filter(e => e.providerSlug === "moviebox").length, "endpoints");
  console.log("Drama:", eps.filter(e => e.providerSlug === "drama").length, "endpoints");
  eps.forEach(e => console.log(e.providerSlug, e.providerName, e.path, e.endpointName));
  await d.$disconnect();
})();
