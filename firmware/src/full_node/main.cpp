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
SoftwareSerial simSerial(3, 2);

void publishMQTT(String payload);
bool waitResponse(const char* expected, uint32_t timeoutMs);
bool sendCommand(const char* cmd, const char* expected, uint32_t timeoutMs);
bool checkSimInternet();

bool waitResponse(const char* expected, uint32_t timeoutMs)
{
  uint32_t startTime = millis();
  uint16_t matchIndex = 0;
  uint16_t expectedLen = strlen(expected);
  
  while (millis() - startTime < timeoutMs)
  {
    if (simSerial.available() > 0)
    {
      char c = simSerial.read();
      Serial.write(c); // Print incoming char to console in real-time
      
      if (c == expected[matchIndex])
      {
        matchIndex++;
        if (matchIndex == expectedLen)
        {
          return true;
        }
      }
      else
      {
        matchIndex = (c == expected[0]) ? 1 : 0;
      }
    }
  }
  return false;
}

bool sendCommand(const char* cmd, const char* expected, uint32_t timeoutMs)
{
  while (simSerial.available() > 0)
  {
    simSerial.read();
  }
  simSerial.println(cmd);
  return waitResponse(expected, timeoutMs);
}

bool checkSimInternet()
{
  Serial.println(F("Starting SIM module initialization check..."));
  
  // 1. Sync autobauding and check basic AT communication
  // Send "AT" multiple times to sync A7680C's autobaud rate to 9600
  bool responding = false;
  for (int i = 0; i < 10; i++)
  {
    if (sendCommand("AT", "OK", 1000))
    {
      responding = true;
      break;
    }
    delay(500);
  }

  if (!responding)
  {
    Serial.println(F("Error: SIM module is not responding!"));
    return false;
  }
  
  // Turn off command echo to prevent SoftwareSerial RX buffer overflow on long commands
  sendCommand("ATE0", "OK", 1000);
  
  // 2. CPIN check (SIM card presence and status)
  if (!sendCommand("AT+CPIN?", "READY", 2000))
  {
    Serial.println(F("Error: SIM card is not ready or PIN locked!"));
    return false;
  }
  
  // 3. Network registration checks (CREG for GSM, CEREG for LTE, CGREG for GPRS)
  // Network registration can take some time, so we retry a few times.
  bool registered = false;
  for (int i = 0; i < 15; i++)
  {
    if (sendCommand("AT+CEREG?", "+CEREG: 0,1", 1000) || sendCommand("AT+CEREG?", "+CEREG: 0,5", 1000) ||
        sendCommand("AT+CGREG?", "+CGREG: 0,1", 1000) || sendCommand("AT+CGREG?", "+CGREG: 0,5", 1000) ||
        sendCommand("AT+CREG?", "+CREG: 0,1", 1000) || sendCommand("AT+CREG?", "+CREG: 0,5", 1000))
    {
      registered = true;
      break;
    }
    Serial.print(F("Searching for network... (attempt "));
    Serial.print(i + 1);
    Serial.println(F("/15)"));
    delay(2000);
  }
  
  if (!registered)
  {
    Serial.println(F("Error: SIM module failed to register to network!"));
    return false;
  }
  
  // 4. GPRS/Packet service attachment check
  bool attached = false;
  for (int i = 0; i < 10; i++)
  {
    if (sendCommand("AT+CGATT?", "+CGATT: 1", 2000))
    {
      attached = true;
      break;
    }
    Serial.print(F("Waiting for GPRS/Packet service attachment... (attempt "));
    Serial.print(i + 1);
    Serial.println(F("/10)"));
    delay(2000);
  }
  
  if (!attached)
  {
    Serial.println(F("Error: GPRS service not attached!"));
    return false;
  }

  // 5. Open Network Service (Required for A7680C TCP/IP/MQTT Stack)
  bool netOpen = false;
  for (int i = 0; i < 5; i++)
  {
    // Check if network is already open without causing a scary error log on failure
    while (simSerial.available() > 0) simSerial.read();
    simSerial.println(F("AT+NETOPEN?"));
    if (waitResponse("+NETOPEN: 1", 2000))
    {
      netOpen = true;
      break;
    }
    
    // Command network open
    while (simSerial.available() > 0) simSerial.read();
    simSerial.println(F("AT+NETOPEN"));
    uint32_t start = millis();
    String netResp = "";
    while (millis() - start < 10000)
    {
      if (simSerial.available() > 0)
      {
        char c = simSerial.read();
        Serial.write(c);
        netResp += c;
        if (netResp.indexOf("+NETOPEN: 0") != -1 || netResp.indexOf("Network is already opened") != -1)
        {
          netOpen = true;
          break;
        }
      }
    }
    if (netOpen) break;
    
    Serial.print(F("Waiting for network service (NETOPEN)... (attempt "));
    Serial.print(i + 1);
    Serial.println(F("/5)"));
    delay(2000);
  }
  
  if (!netOpen)
  {
    Serial.println(F("Error: Failed to open network service (NETOPEN)!"));
    return false;
  }

  // 6. Query and output IP address for confirmation
  sendCommand("AT+IPADDR", "OK", 2000);
  
  Serial.println(F("Success: SIM module has active internet connection and IP address!"));
  return true;
}

void setup()
{
  Serial.begin(9600);
  
  // Try to connect at 115200 first to configure/force the module to 9600 baud rate
  Serial.println(F("Configuring SIM module baud rate..."));
  simSerial.begin(115200);
  delay(1000);
  simSerial.println("AT+IPR=9600");
  delay(1000);
  simSerial.println("AT&W"); // Save configuration permanently in SIM module NVRAM
  delay(1000);
  
  // Re-start SoftwareSerial communication at the stable 9600 rate
  simSerial.begin(9600);
  
  dht.begin();
  mlx.begin();

  LoRa.setPins(10, 9, 8);
  if (!LoRa.begin(433E6))
  {
    Serial.println(F("LoRa init failed!"));
  }

  Serial.println(F("System Initializing..."));
  delay(2000);

  if (checkSimInternet())
  {
    Serial.println(F("SIM Module Internet Check: PASSED"));
  }
  else
  {
    Serial.println(F("SIM Module Internet Check: FAILED"));
  }

  delay(5000);
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
  Serial.println(F("Publishing to MQTT broker..."));

  // 1. Ensure Network is open (AT+NETOPEN)
  bool netOpen = false;
  // Check status first without verbose command fail log
  while (simSerial.available() > 0) simSerial.read();
  simSerial.println(F("AT+NETOPEN?"));
  if (waitResponse("+NETOPEN: 1", 2000))
  {
    netOpen = true;
  }
  else
  {
    // Try to open it
    while (simSerial.available() > 0) simSerial.read();
    simSerial.println(F("AT+NETOPEN"));
    uint32_t start = millis();
    String netResp = "";
    while (millis() - start < 10000)
    {
      if (simSerial.available() > 0)
      {
        char c = simSerial.read();
        Serial.write(c);
        netResp += c;
        if (netResp.indexOf("+NETOPEN: 0") != -1 || netResp.indexOf("Network is already opened") != -1)
        {
          netOpen = true;
          break;
        }
      }
    }
  }

  if (!netOpen)
  {
    Serial.println(F("Error: Network (NETOPEN) could not be opened!"));
    return;
  }

  // 2. Start MQTT service (might return error if already started, which we bypass)
  sendCommand("AT+CMQTTSTART", "OK", 2000);

  bool isSSL = (MQTT_PORT == 8883);

  if (isSSL)
  {
    // Configure SSL Context 0 for MQTTS connection
    sendCommand("AT+CSSLCFG=\"sslversion\",0,4", "OK", 2000);       // TLS 1.2
    sendCommand("AT+CSSLCFG=\"authmode\",0,0", "OK", 2000);         // No server certificate verification
    sendCommand("AT+CSSLCFG=\"ignorelocaltime\",0,1", "OK", 2000);  // Ignore local time mismatch (handy if RTC is off)
    sendCommand("AT+CSSLCFG=\"enableSNI\",0,1", "OK", 2000);        // Enable SNI for cloud brokers (like EMQX Cloud)
    // Link MQTT client 0 to SSL context 0
    sendCommand("AT+CMQTTSSLCFG=0,0", "OK", 2000);
  }

  // 3. Acquire Client (0 is client index, 0 is TCP, 1 is SSL)
  while (simSerial.available() > 0) simSerial.read();
  simSerial.print(F("AT+CMQTTACCQ=0,\""));
  simSerial.print(MQTT_CLIENT_ID);
  simSerial.print(F("\","));
  simSerial.println(isSSL ? 1 : 0);
  if (!waitResponse("OK", 2000))
  {
    Serial.println(F("MQTT acquire client failed!"));
    return;
  }

  // 4. Connect to Broker (asynchronous, wait for +CMQTTCONNECT: 0,0 success)
  // We send the parameters piece-by-piece to avoid heap allocations
  while (simSerial.available() > 0) simSerial.read();
  simSerial.print(F("AT+CMQTTCONNECT=0,\""));
  if (isSSL)
  {
    simSerial.print(F("ssl://"));
  }
  else
  {
    simSerial.print(F("tcp://"));
  }
  simSerial.print(MQTT_BROKER);
  simSerial.print(F(":"));
  simSerial.print(MQTT_PORT);
  simSerial.print(F("\",60,1"));
  
  String username = String(MQTT_USER);
  String password = String(MQTT_PASS);
  if (username != "" && username != "your_mqtt_username")
  {
    simSerial.print(F(",\""));
    simSerial.print(username);
    simSerial.print(F("\",\""));
    simSerial.print(password);
    simSerial.print(F("\""));
  }
  simSerial.println();
  
  if (!waitResponse("+CMQTTCONNECT: 0,0", 15000))
  {
    Serial.println(F("MQTT connection failed!"));
    // Clean up acquired client
    sendCommand("AT+CMQTTRELEASE=0", "OK", 2000);
    sendCommand("AT+CMQTTSTOP", "OK", 2000);
    return;
  }

  // 5. Set Topic
  String topic = String(MQTT_TOPIC);
  while (simSerial.available() > 0) simSerial.read();
  simSerial.print(F("AT+CMQTTTOPIC=0,"));
  simSerial.println(topic.length());
  
  bool topicInputSuccess = false;
  if (waitResponse(">", 2000))
  {
    simSerial.print(topic);
    if (waitResponse("OK", 3000))
    {
      topicInputSuccess = true;
    }
  }

  if (!topicInputSuccess)
  {
    Serial.println(F("Failed to set MQTT topic!"));
    sendCommand("AT+CMQTTDISC=0,120", "+CMQTTDISC: 0,0", 5000);
    sendCommand("AT+CMQTTRELEASE=0", "OK", 2000);
    sendCommand("AT+CMQTTSTOP", "OK", 2000);
    return;
  }

  // 6. Set Payload
  while (simSerial.available() > 0) simSerial.read();
  simSerial.print(F("AT+CMQTTPAYLOAD=0,"));
  simSerial.println(payload.length());
  
  bool payloadInputSuccess = false;
  if (waitResponse(">", 2000))
  {
    simSerial.print(payload);
    if (waitResponse("OK", 3000))
    {
      payloadInputSuccess = true;
    }
  }

  if (!payloadInputSuccess)
  {
    Serial.println(F("Failed to set MQTT payload!"));
    sendCommand("AT+CMQTTDISC=0,120", "+CMQTTDISC: 0,0", 5000);
    sendCommand("AT+CMQTTRELEASE=0", "OK", 2000);
    sendCommand("AT+CMQTTSTOP", "OK", 2000);
    return;
  }

  // 7. Publish (asynchronous, wait for +CMQTTPUB: 0,0 success)
  if (!sendCommand("AT+CMQTTPUB=0,1,60", "+CMQTTPUB: 0,0", 10000))
  {
    Serial.println(F("MQTT publish failed!"));
  }

  // 8. Disconnect and release resources
  sendCommand("AT+CMQTTDISC=0,120", "+CMQTTDISC: 0,0", 5000);
  sendCommand("AT+CMQTTRELEASE=0", "OK", 2000);
  sendCommand("AT+CMQTTSTOP", "OK", 2000);
}
