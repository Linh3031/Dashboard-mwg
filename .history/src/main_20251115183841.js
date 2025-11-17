import './app.css'
import App from './App.svelte'
import { mount } from 'svelte' // <-- THAY ĐỔI 1: Import 'mount'

// THAY ĐỔI 2: Chúng ta không dùng 'new App' nữa
const app = mount(App, {
  target: document.getElementById('app'),
})

export default app