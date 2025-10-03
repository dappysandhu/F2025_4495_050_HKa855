import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { router, useRouter } from 'expo-router';
import React, {useState} from 'react';
import { StyleSheet, TextInput, TouchableOpacity,View} from 'react-native'
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native'; 

export default function LoginScreen(){

  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [hidePassword,setHidePassword]=useState(true)
 const router=useRouter()

   const colorScheme = useColorScheme(); 
  const themeColors = Colors[colorScheme || 'light'];

  return(
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ThemedText type="title" style={styles.logoText}>CERA</ThemedText>

      <TextInput style={[styles.input,{ 
    backgroundColor: themeColors.background, 
    color: themeColors.text, 
    borderColor: themeColors.icon, 
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 10,
  }]}  
      placeholder='Enter your Email'
      placeholderTextColor={themeColors.icon}
      value={email}
      onChangeText={setEmail}
      autoCapitalize='none'/>

      <View style={[styles.passwordContainer,
      { 
    backgroundColor: themeColors.background, 
   
    borderColor: themeColors.icon, 
    borderWidth: 1 
  }]}>
      <TextInput style={[styles.passwordInput, {color: themeColors.text  }]}
      placeholder='Enter your password'
      placeholderTextColor={themeColors.icon}
      secureTextEntry={hidePassword}
      value={password}
      onChangeText={setPassword}/>
      <TouchableOpacity onPress={() => setHidePassword(s => !s)}>
        <Ionicons name={hidePassword ? 'eye-off' : 'eye'} size={24} color="#555"/>
      </TouchableOpacity>

      </View>

      <TouchableOpacity style={styles.button} onPress={()=> console.log('login')}>
        <ThemedText type="defaultSemiBold" style={styles.buttonText}>Login</ThemedText>

      </TouchableOpacity>

      <View style={styles.orContainer}>
        <View style={styles.line}/>
        <ThemedText type="default" style={styles.orText}>OR</ThemedText>
        <View style={styles.line}/>

      </View>

      <ThemedText style={styles.signupText}>
        Don't have an account ? {' '}
        <ThemedText type="link" onPress={()=> router.push('/signup')} style={{color:'#BC4B2F'}}>
          Sign up
      </ThemedText>
      </ThemedText>

    </ThemedView>
  )
}


const styles = StyleSheet.create({
  container:{
    flex:1,
    justifyContent:"center",
    padding:20,
   
  },
  logoText:{
    textAlign:"center",
    padding:20
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordContainer:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#fff",
    borderRadius:10,
    paddingHorizontal:12,
    marginVertical:10,
   
   
  },
  passwordInput:{
    flex:1,
    paddingVertical:12,
    fontSize:16,
  },
  button:{
    backgroundColor:"#C04A2B",
    padding:15,
    borderRadius:10,
    marginTop:20,
    alignItems:"center"
  },
  buttonText:{
    color:"#fff",
    fontSize:16,
    fontWeight:"bold",
  },
  orContainer:{
    flexDirection:"row",
    alignItems:"center",
    marginVertical:20,
  },
  line:{
    flex:1,
    height:1,
    backgroundColor:"#555",
  },
  orText:{
    marginHorizontal:10,
    color:"#aaa"
  },
  signupText:{
    textAlign:"center",
    marginTop:10,
  }

})