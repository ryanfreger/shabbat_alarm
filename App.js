import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import moment from "moment";
import { Checkbox } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [sunsetTime, setSunsetTime] = useState(null);
  const [cityName, setCityName] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      const nextFriday = getNextFriday(new Date());

      fetch(
        `http://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${nextFriday}&formatted=0`,
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      )
        .then((resp) => resp.json())
        .then((data) => {
          const sunsetDateTime = data.results.sunset;
          if (sunsetDateTime) {
            let sunsetText;
            const sunsetInLongFormat = Date.parse(sunsetDateTime);
            const localTimeZoneOffset = new Date().getTimezoneOffset();
            const adjustedSunsetTime = moment(
              sunsetInLongFormat - localTimeZoneOffset
            );
            sunsetText = adjustedSunsetTime.format("LL h:mma");
            setSunsetTime(sunsetText);
          } else {
            sunsetText = "Error";
          }
        });

      let geoCode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (geoCode[0]?.city) {
        setCityName(geoCode[0].city);
      }
      getData();
    })();
  }, []);

  const getNextFriday = (date = new Date()) => {
    const dateCopy = new Date(date.getTime());

    const nextFriday = new Date(
      dateCopy.setDate(
        dateCopy.getDate() + ((7 - dateCopy.getDay() + 5) % 7 || 7)
      )
    );
    return nextFriday.toISOString().slice(0, 10);
  };

  const storeData = async (value) => {
    try {
      await AsyncStorage.setItem("@reminder", value);
    } catch (e) {
      console.log("error saving value");
    }
  };

  const getData = async () => {
    try {
      const value = await AsyncStorage.getItem("@reminder");
      const keys = await AsyncStorage.getAllKeys();
      if (value) {
        setChecked(value);
      }
    } catch (e) {
      setChecked(false);
    }
  };

  return (
    <View>
      <Text style={styles.header}>Shabbat Alarm</Text>
      <View style={styles.container}>
        <Text>{`You're in ${cityName}`}</Text>
        <Text>{`Next Shabbat begins at: ${sunsetTime}`}</Text>
        <View style={{ justifyContent: "center" }}>
          <Checkbox.Item
            label="Remind me"
            color="green"
            style={{ borderColor: "blue", borderWidth: 1, borderRadius: 20 }}
            status={checked ? "checked" : "unchecked"}
            onPress={() => {
              setChecked(!checked);
              storeData(!checked ? "true" : "");
            }}
          />
        </View>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "space-around",
    height: "50%",
  },
  header: {
    fontSize: 24,
    fontWeight: "500",
    marginTop: 50,
    alignSelf: "center",
  },
});
