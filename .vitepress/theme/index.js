import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import MusicPlayer from '../components/MusicPlayer.vue'
import './custom.css'

// 自定义Layout，在导航栏和主内容之间插入播放器
function CustomLayout() {
  return h(DefaultTheme.Layout, null, {
    'nav-bar-content-after': () => h('div', { class: 'navbar-player-wrapper' }, [
      h(MusicPlayer, { class: 'navbar-music-player' })
    ])
  })
}

export default {
  extends: DefaultTheme,
  Layout: CustomLayout,
  enhanceApp({ app }) {
    app.component('MusicPlayer', MusicPlayer)
  }
}
