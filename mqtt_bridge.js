import mqtt from "mqtt";

// Read API URL and INGEST KEY, or use defaults
const API_URL = "http://localhost:5174/api/ingest/mqtt";
const API_KEY = "test-key";

const client = mqtt.connect({
  host: "o018fc02.ala.asia-southeast1.emqxsl.com",
  port: 8883,
  protocol: "mqtts",
  username: "admin",
  password: "admin",
});

client.on("connect", () => {
  console.log("MQTT Bridge connected to broker. Subscribing to emberroot/sensors...");
  client.subscribe("emberroot/sensors", (err) => {
    if (err) {
      console.error("Failed to subscribe:", err);
    } else {
      console.log("Subscribed. Listening for messages...");
    }
  });
});

client.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log(`Received message on ${topic}:`, payload);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("Successfully forwarded to backend:", await response.json());
    } else {
      console.error("Backend returned error:", await response.text());
    }
  } catch (err) {
    console.error("Error processing message:", err);
  }
});
