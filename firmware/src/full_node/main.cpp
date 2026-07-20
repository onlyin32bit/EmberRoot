#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <SoftwareSerial.h>

#ifndef MQTT_BROKER
#define MQTT_BROKER "tcp://broker.hivemq.com:1883"
#endif

#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif

#ifndef MQTT_USER
#define MQTT_USER ""
#endif

#ifndef MQTT_PASS
#define MQTT_PASS ""
#endif

#ifndef MQTT_CLIENT_ID
#define MQTT_CLIENT_ID "EmberRootNode01"
#endif

#ifndef MQTT_TOPIC
#define MQTT_TOPIC "emberroot/sensors"
#endif

#define DHTPIN 7
#define DHTTYPE DHT11
#define MQ2_PIN A0
#define MQ7_PIN A1
#define SOIL_PIN A2

DHT dht(DHTPIN, DHTTYPE);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();
SoftwareSerial simSerial(2, 3);

void publishMQTT(String payload);

void setup()
{
  Serial.begin(9600);
  simSerial.begin(115200);
  dht.begin();
  mlx.begin();

  LoRa.setPins(10, 9, 8);
  if (!LoRa.begin(433E6))
  {
    Serial.println("LoRa init failed!");
  }

  Serial.println("System Initializing...");
  delay(10000);
}

void loop()
{
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  float tempObj = mlx.readObjectTempC();
  int mq2 = analogRead(MQ2_PIN);
  int mq7 = analogRead(MQ7_PIN);
  int soil = analogRead(SOIL_PIN);

  String data = "{\"t\":" + String(t) + ",\"h\":" + String(h) +
                ",\"tempObj\":" + String(tempObj) +
                ",\"mq2\":" + String(mq2) +
                ",\"mq7\":" + String(mq7) +
                ",\"soil\":" + String(soil) + "}";

  Serial.println("Data to send: " + data);
  publishMQTT(data);

  delay(60000);
}

void publishMQTT(String payload)
{
  Serial.println("Publishing to MQTT broker...");

  simSerial.println("AT+CMQTTSTART");
  delay(1000);

  simSerial.println("AT+CMQTTACCQ=0,\"" + String(MQTT_CLIENT_ID) + "\"");
  delay(1000);

  String connectCmd = "AT+CMQTTCONNECT=0,\"" + String(MQTT_BROKER) + "\",60,1";
  String username = String(MQTT_USER);
  String password = String(MQTT_PASS);
  if (username != "" && username != "your_mqtt_username")
  {
    connectCmd += ",\"" + username + "\",\"" + password + "\"";
  }
  simSerial.println(connectCmd);
  delay(3000);

  String topic = String(MQTT_TOPIC);
  simSerial.println("AT+CMQTTTOPIC=0," + String(topic.length()));
  delay(1000);
  simSerial.print(topic);
  delay(1000);

  simSerial.println("AT+CMQTTPAYLOAD=0," + String(payload.length()));
  delay(1000);
  simSerial.print(payload);
  delay(1000);

  simSerial.println("AT+CMQTTPUB=0,1,60");
  delay(3000);

  simSerial.println("AT+CMQTTDISC=0,120");
  delay(1000);
  simSerial.println("AT+CMQTTRELEASE=0");
  delay(1000);
  simSerial.println("AT+CMQTTSTOP");
  delay(1000);
}
