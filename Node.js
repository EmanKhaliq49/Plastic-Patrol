const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const IBM_API_KEY = process.env.IBM_API_KEY; // secure via Replit
const PROJECT_ID = "9af7b51d-cf76-40e0-8fc3-27b234580caa";
const MODEL_ID = "ibm/granite-3-3-8b-instruct";

async function getIBMToken() {
  const resp = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${IBM_API_KEY}`,
  });
  const data = await resp.json();
  return data.access_token;
}

app.post("/granite", async (req, res) => {
  try {
    if (!IBM_API_KEY) {
      return res.status(500).json({ error: "IBM_API_KEY not configured" });
    }

    const prompt = req.body.prompt;
    console.log("Getting IBM token...");
    const token = await getIBMToken();

    if (!token) {
      return res.status(500).json({ error: "Failed to get IBM token" });
    }

    console.log("Calling Granite API with prompt:", prompt);
    const graniteResp = await fetch(
      "https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a recycling expert. Provide specific recycling instructions for plastic items.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          project_id: PROJECT_ID,
          model_id: MODEL_ID,
          frequency_penalty: 0,
          max_tokens: 2000,
          presence_penalty: 0,
          temperature: 0.7,
          top_p: 1,
          seed: null,
          stop: [],
        }),
      },
    );

    const data = await graniteResp.json();
    console.log("Granite API response:", data);

    if (!graniteResp.ok) {
      console.error("Granite API error:", data);
      return res
        .status(500)
        .json({ error: "Granite API error", details: data });
    }

    res.json(data);
  } catch (e) {
    console.error("Error in /granite endpoint:", e);
    res
      .status(500)
      .json({ error: "Internal server error", details: e.message });
  }
});

app.get("/", (req, res) => res.sendFile("index.html", { root: __dirname }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
