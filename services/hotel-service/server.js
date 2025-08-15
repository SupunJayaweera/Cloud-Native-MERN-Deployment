const app = require("./app");

const PORT = process.env.PORT || 3002;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hotel Service running on port ${PORT}`);
});
