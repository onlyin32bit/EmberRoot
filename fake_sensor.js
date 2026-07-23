import mqtt from "mqtt";

const client = mqtt.connect({
  host: "o018fc02.ala.asia-southeast1.emqxsl.com",
  port: 8883,
  protocol: "mqtts",
  username: "admin",
  password: "admin",
});

client.on("connect", () => {
  console.log("Connected!");
  setInterval(() => {
    const payload = {
      nodeId: "node-01",
      timestamp: new Date().toISOString(),
      temp5: 25 + Math.random() * 10,
      temp15: 23 + Math.random() * 8,
      ambientTemp: 27 + Math.random() * 5,
      ambientRh: 60 + Math.random() * 20,
      co: Math.floor(Math.random() * 50),
      co2: 400 + Math.floor(Math.random() * 200),
      ch4: Math.floor(Math.random() * 10),
      moisture: 30 + Math.random() * 40,
      batteryPct: 70 + Math.random() * 30,
      latitude: 21.028,
      longitude: 105.835,
    };

    client.publish(
      "emberroot/sensors",
      JSON.stringify(payload),
      (err) => {
        if (err) {
          console.error("Publish failed:", err);
        } else {
          console.log("Published data ping:", payload.timestamp);
        }
      }
    );
  }, 5000); // Send a signal every 5 seconds
});