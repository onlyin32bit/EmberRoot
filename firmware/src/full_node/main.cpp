#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <SoftwareSerial.h>

#ifndef MQTT_BROKER
// Hostname only. The firmware adds tcp:// and MQTT_PORT below.
#define MQTT_BROKER "broker.hivemq.com"
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

bool publishMQTT(const String& payload);
bool waitResponse(const char* expected, uint32_t timeoutMs);
bool sendCommand(const char* cmd, const char* expected, uint32_t timeoutMs);
bool checkSimInternet();
bool startMQTTService();
bool cleanupMQTT(bool connected, bool clientAcquired, bool serviceStarted);
void appendJsonFloat(String& json, float value);

bool waitResponse(const char* expected, uint32_t timeoutMs)
{
  uint32_t startTime = millis();
  uint16_t matchIndex = 0;
  uint16_t expectedLen = strlen(expected);
  const char errorResponse[] = "ERROR";
  uint8_t errorMatchIndex = 0;
  
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

      // Do not wait for the full timeout after the modem has rejected a command.
      if (c == errorResponse[errorMatchIndex])
      {
        errorMatchIndex++;
        if (errorMatchIndex == sizeof(errorResponse) - 1)
        {
          return false;
        }
      }
      else
      {
        errorMatchIndex = (c == errorResponse[0]) ? 1 : 0;
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
  // Keep the debug UART faster than the modem SoftwareSerial link so printing
  // modem responses cannot fill the SoftwareSerial receive buffer.
  Serial.begin(115200);
  
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

  // DHT sensors occasionally fail a read. Give the slow DHT11 one retry.
  if (isnan(t) || isnan(h))
  {
    delay(2000);
    t = dht.readTemperature();
    h = dht.readHumidity();
  }

  float tempObj = mlx.readObjectTempC();
  int mq2 = analogRead(MQ2_PIN);
  int mq7 = analogRead(MQ7_PIN);
  int soil = analogRead(SOIL_PIN);

  // JSON does not support NaN. Use null for a failed sensor read so EMQX and
  // downstream JSON consumers can still parse the rest of the measurements.
  String data;
  data.reserve(128);
  data = F("{\"node_id\":\"");
  data += MQTT_CLIENT_ID;
  data += F("\",\"t\":");
  appendJsonFloat(data, t);
  data += F(",\"h\":");
  appendJsonFloat(data, h);
  data += F(",\"tempObj\":");
  appendJsonFloat(data, tempObj);
  data += F(",\"mq2\":");
  data += mq2;
  data += F(",\"mq7\":");
  data += mq7;
  data += F(",\"soil\":");
  data += soil;
  data += '}';

  Serial.println("Data to send: " + data);
  if (!publishMQTT(data))
  {
    Serial.println(F("MQTT publish cycle FAILED"));
  }

  delay(60000);
}

void appendJsonFloat(String& json, float value)
{
  if (isnan(value) || isinf(value))
  {
    json += F("null");
  }
  else
  {
    json += String(value, 2);
  }
}

bool startMQTTService()
{
  // CMQTTSTART is asynchronous: the initial OK only acknowledges the command;
  // +CMQTTSTART: 0 confirms that the service actually started.
  if (sendCommand("AT+CMQTTSTART", "+CMQTTSTART: 0", 10000))
  {
    return true;
  }

  // A previous MCU reset may leave client 0 allocated inside the modem. Clear
  // that stale state and retry once. Failures here are harmless when a given
  // resource was not active.
  Serial.println(F("MQTT service was already/still active; resetting modem MQTT state..."));
  sendCommand("AT+CMQTTDISC=0,60", "+CMQTTDISC: 0,0", 5000);
  sendCommand("AT+CMQTTREL=0", "OK", 2000);
  sendCommand("AT+CMQTTSTOP", "+CMQTTSTOP: 0", 5000);

  if (!sendCommand("AT+CMQTTSTART", "+CMQTTSTART: 0", 10000))
  {
    Serial.println(F("MQTT service start failed!"));
    return false;
  }

  return true;
}

bool cleanupMQTT(bool connected, bool clientAcquired, bool serviceStarted)
{
  bool success = true;

  if (connected && !sendCommand("AT+CMQTTDISC=0,120", "+CMQTTDISC: 0,0", 10000))
  {
    Serial.println(F("Warning: MQTT disconnect failed"));
    success = false;
  }

  // The A76xx command is CMQTTREL (not CMQTTRELEASE). A client must be
  // released before CMQTTSTOP, otherwise CMQTTSTOP returns error 19.
  if (clientAcquired && !sendCommand("AT+CMQTTREL=0", "OK", 3000))
  {
    Serial.println(F("Warning: MQTT client release failed"));
    success = false;
  }

  if (serviceStarted && !sendCommand("AT+CMQTTSTOP", "+CMQTTSTOP: 0", 10000))
  {
    Serial.println(F("Warning: MQTT service stop failed"));
    success = false;
  }

  return success;
}

bool publishMQTT(const String& payload)
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
    return false;
  }

  // 2. Start MQTT service and wait for its asynchronous result.
  if (!startMQTTService())
  {
    return false;
  }

  bool serviceStarted = true;
  bool clientAcquired = false;
  bool connected = false;

  bool isSSL = (MQTT_PORT == 8883);

  if (isSSL)
  {
    // Configure SSL Context 0 for MQTTS connection
    bool sslConfigured =
      sendCommand("AT+CSSLCFG=\"sslversion\",0,4", "OK", 2000) &&       // TLS 1.2
      sendCommand("AT+CSSLCFG=\"authmode\",0,0", "OK", 2000) &&         // No server certificate verification
      sendCommand("AT+CSSLCFG=\"ignorelocaltime\",0,1", "OK", 2000) &&  // Ignore local time mismatch if RTC is off
      sendCommand("AT+CSSLCFG=\"enableSNI\",0,1", "OK", 2000);          // Required by hosted EMQX endpoints

    if (!sslConfigured)
    {
      Serial.println(F("MQTT TLS configuration failed!"));
      cleanupMQTT(connected, clientAcquired, serviceStarted);
      return false;
    }
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
    cleanupMQTT(connected, clientAcquired, serviceStarted);
    return false;
  }
  clientAcquired = true;

  if (isSSL)
  {
    // Link MQTT client 0 to SSL context 0. Must be done AFTER acquiring client (CMQTTACCQ)
    if (!sendCommand("AT+CMQTTSSLCFG=0,0", "OK", 2000))
    {
      Serial.println(F("MQTT TLS client binding failed!"));
      cleanupMQTT(connected, clientAcquired, serviceStarted);
      return false;
    }
  }

  // 4. Connect to Broker (asynchronous, wait for +CMQTTCONNECT: 0,0 success)
  // We send the parameters piece-by-piece to avoid heap allocations
  while (simSerial.available() > 0) simSerial.read();
  simSerial.print(F("AT+CMQTTCONNECT=0,\""));
  // Always use tcp:// prefix, as SIMCom modules use SSL context routing based on port 8883 and CMQTTSSLCFG
  simSerial.print(F("tcp://"));
  simSerial.print(MQTT_BROKER);
  simSerial.print(F(":"));
  simSerial.print(MQTT_PORT);
  simSerial.print(F("\",60,1"));
  
  const char* username = MQTT_USER;
  const char* password = MQTT_PASS;
  if (username[0] != '\0' && strcmp(username, "your_mqtt_username") != 0)
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
    cleanupMQTT(connected, clientAcquired, serviceStarted);
    return false;
  }
  connected = true;

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
    cleanupMQTT(connected, clientAcquired, serviceStarted);
    return false;
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
    cleanupMQTT(connected, clientAcquired, serviceStarted);
    return false;
  }

  // 7. Publish (asynchronous, wait for +CMQTTPUB: 0,0 success)
  bool published = sendCommand("AT+CMQTTPUB=0,1,60", "+CMQTTPUB: 0,0", 10000);
  if (!published)
  {
    Serial.println(F("MQTT publish failed!"));
  }
  else
  {
    Serial.println(F("MQTT publish succeeded"));
  }

  // 8. Disconnect and release resources
  cleanupMQTT(connected, clientAcquired, serviceStarted);
  return published;
}
