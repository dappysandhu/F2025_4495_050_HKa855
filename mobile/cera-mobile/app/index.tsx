import { Redirect } from 'expo-router';

export default function Index() {
  //safe redirect
  return <Redirect href="/auth/login" />;
}
