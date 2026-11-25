import BuzzerScreen from "@/components/BuzzerScreen";

/** The host's buzzer screen: opened from the console, signed in by typing the host password. */
export default function BuzzersPage() {
  return <BuzzerScreen auth={{ kind: "session" }} />;
}
