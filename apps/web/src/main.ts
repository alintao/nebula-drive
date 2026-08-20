import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './glass.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import { router } from './router';
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus, { size: 'default' });
for (const [name, comp] of Object.entries(ElementPlusIconsVue)) {
  app.component(name, comp);
}
app.mount('#app');
