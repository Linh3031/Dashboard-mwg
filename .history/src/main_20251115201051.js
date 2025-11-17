// File: src/main.js
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte' // Dùng 'mount' thay vì 'new'

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app