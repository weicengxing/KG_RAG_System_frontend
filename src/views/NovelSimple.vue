<template>
  <div class="novel-reader">
    <div class="reader-header">
      <div class="header-star-bg" ref="headerStarContainer"></div> <!-- New star container in header -->
      <h1 class="site-title">文学殿堂</h1>

      <div class="header-controls">
        <el-dropdown trigger="click" @command="changeTheme">
          <el-button type="primary" plain size="small">
            <span>主题风格</span>
            <i class="el-icon-arrow-down el-icon--right"></i>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="light">清新风格</el-dropdown-item>
              <el-dropdown-item command="dark">暗黑风格</el-dropdown-item>
              <el-dropdown-item command="sepia">复古风格</el-dropdown-item>
              <el-dropdown-item command="eyecare">护眼模式</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="changeFont">
          <el-button type="primary" plain size="small">
            <span>字体选择</span>
            <i class="el-icon-arrow-down el-icon--right"></i>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="default">默认字体</el-dropdown-item>
              <el-dropdown-item command="songti">宋体</el-dropdown-item>
              <el-dropdown-item command="kaiti">楷体</el-dropdown-item>
              <el-dropdown-item command="yahei">微软雅黑</el-dropdown-item>
              <el-dropdown-item command="fangsong">仿宋</el-dropdown-item>
              <el-dropdown-item command="xingkai">行楷</el-dropdown-item>
              <el-dropdown-item command="xingcao">行草</el-dropdown-item>
              <el-dropdown-item divided command="preview">字体预览</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="changeTextColor">
          <el-button type="primary" plain size="small">
            <span>字体颜色</span>
            <i class="el-icon-arrow-down el-icon--right"></i>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="default">默认颜色</el-dropdown-item>
              <el-dropdown-item command="black">黑色</el-dropdown-item>
              <el-dropdown-item command="darkgrey">深灰色</el-dropdown-item>
              <el-dropdown-item command="darkblue">深蓝色</el-dropdown-item>
              <el-dropdown-item command="green">绿色</el-dropdown-item>
              <el-dropdown-item command="brown">棕色</el-dropdown-item>
              <el-dropdown-item command="purple">紫色</el-dropdown-item>
              <el-dropdown-item command="custom">自定义颜色</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button-group>
          <el-button type="primary" plain size="small" @click="decreaseFontSize">
            <el-icon><Minus /></el-icon>
          </el-button>
          <el-button type="primary" plain size="small" @click="increaseFontSize">
            <el-icon><Plus /></el-icon>
          </el-button>
        </el-button-group>
      </div>
    </div>
    <div class="reader-container" :class="theme">
      <div class="catalog-panel" :class="{ 'hidden': !isCatalogVisible }">
        <div class="catalog-header">
          <h2>小说目录</h2>
          <el-input
            v-model="searchQuery"
            placeholder="搜索小说"
            clearable
            prefix-icon="el-icon-search"
            size="small"
          ></el-input>
        </div>
        <div class="novel-list">
          <div
            v-for="(novel, index) in filteredNovels"
            :key="index"
            :class="['novel-item', { 'active': currentIndex === getOriginalIndex(novel) }]"
            @click="selectNovel(getOriginalIndex(novel))"
          >
            <i class="el-icon-notebook-1"></i>
            <!-- VIP Badge -->
            <!-- <span v-if="hui == '1' && novel.quan == 0" class="vip-badge">VIP</span> -->

    <Vip v-if="hui == '1' && novel.quan == 0"/>

            <span class="novel-title">{{ novel.title }}</span>
            <el-icon v-if="novel.quan === 0&&hui=='' " class="lock-icon"><Lock /></el-icon>
          </div>
        </div>
      </div>
      <div class="catalog-toggle-bar" @click="toggleCatalog">
        <el-icon>
          <component :is="isCatalogVisible ? 'CaretLeft' : 'CaretRight'"></component>
        </el-icon>
      </div>
      <div class="content-panel" ref="contentPanel">
        <div class="content-header">
          <h2 class="content-title">
            <div class="title-and-badge"> <!-- Added flex container -->
              <ParentComponent  v-if="currentNovelObject.quan === 0&&hui=='1' "   />
              <span >{{ "第"+curzhang+"篇" +" "+currentTitle }}</span> <!-- Wrapped title text in span -->
            </div>
          </h2>
          <div class="font-preview" v-if="showFontPreview">
            <div class="preview-title">字体预览</div>
            <div class="preview-content">
              <div
                v-for="(family, key) in fontFamilies"
                :key="key"
                :class="['preview-item', { active: selectedFontKey === key }]"
                :style="{ fontFamily: family }"
                @click="changeFont(key)"
              >
                <span class="preview-name">{{ fontNames[key] }}</span>
                <span class="preview-text">文学殿堂 - 知识的海洋</span>
              </div>
            </div>
            <div class="preview-actions">
              <el-button size="small" type="primary" @click="showFontPreview = false">关闭预览</el-button>
            </div>
          </div>
          <div class="reading-progress">
            <span>阅读进度</span>
            <el-progress :percentage="readingProgress" :stroke-width="8" :format="percentFormat"></el-progress>
          </div>
        </div>
        <div
          class="content-body"
          :key="curzhang"
          :style="{ fontSize: fontSize + 'px', fontFamily: selectedFont, color: textColor }"
          @scroll="throttledScrollHandler"
          ref="contentBody"
        >
          <div class="content-flex-container"> <!-- 添加 flex 容器 -->
            <WingDecorationLeft v-if="contentLoading && (wingDisplayMode === 0 || wingDisplayMode === 1 || wingDisplayMode === 4)"/> <!-- 添加左侧翅膀组件 -->
            <transition name="fade" mode="out-in">
              <div class="novel-content" :key="curzhang">
                <div class="chapter-title" :style="{ fontFamily: selectedFont }">{{ currentChapterTitle }}</div>
                <div v-if="contentLoading" class="loading-container">
                  <el-skeleton :rows="10" animated />
                  <div class="loading-text">
                    <span
                      v-for="(char, index) in `正在加载《${currentTitle}》...`"
                      :key="index"
                      class="loading-char"
                    >
                      {{ char }}
                    </span>
                  </div>
                </div>
                <div v-else-if="error" class="error-container">
                  <i class="el-icon-warning-outline"></i>
                  <div class="error-message">{{ errorMessage }}</div>
                  <el-button type="primary" size="small" @click="loadNovelContent">重试</el-button>
                </div>
                <div v-else>
                  <div class="wave-container">
                    <svg viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg">
                        <!-- Multiple thin line waves with varying opacity to create the line texture effect -->

                        <!-- Wave Group 1 - Lighter Green Lower Wave -->
                        <g opacity="0.5">
                            <path d="M0,150 C100,120 200,230 300,180 C400,130 500,240 600,190 C700,140 800,250 900,200 C950,190 975,180 1000,190"
                                  fill="none"
                                  stroke="#a4f99c"
                                  stroke-width="30"
                                  stroke-linecap="round" />
                        </g>

                        <!-- Wave Group 2 - Center flowing bright green waves -->
                        <g opacity="0.7">
                            <path d="M0,140 C100,100 200,210 300,170 C400,130 500,190 600,160 C700,130 800,200 900,170 C950,160 975,150 1000,170"
                                  fill="none"
                                  stroke="#70e85d"
                                  stroke-width="20"
                                  stroke-linecap="round" />
                        </g>

                        <!-- Wave Group 3 - Bright thin lines for detail -->
                        <g opacity="0.9">
                            <path d="M0,130 C100,90 200,200 300,160 C400,120 500,180 600,150 C700,120 800,190 900,160 C950,150 975,140 1000,160"
                                  fill="none"
                                  stroke="#8df089"
                                  stroke-width="2"
                                  stroke-linecap="round" />
                        </g>

                        <!-- Wave Group 4 - Topmost bright thin lines -->
                        <g opacity="0.8">
                            <path d="M0,120 C100,70 200,190 300,140 C400,90 500,160 600,130 C700,100 800,170 900,140 C950,130 975,120 1000,140"
                                  fill="none"
                                  stroke="#8df089"
                                  stroke-width="2"
                                  stroke-linecap="round" />
                        </g>

                        <!-- Additional thin lines to create the detailed line texture seen in the original -->
                        <g opacity="0.6">
                            <path d="M0,135 C100,95 200,205 300,165 C400,125 500,185 600,155 C700,125 800,195 900,165 C950,155 975,145 1000,165"
                                  fill="none"
                                  stroke="#a4f99c"
                                  stroke-width="1"
                                  stroke-linecap="round" />
                        </g>

                        <g opacity="0.6">
                            <path d="M0,125 C100,85 200,195 300,155 C400,115 500,175 600,145 C700,115 800,185 900,155 C950,145 975,135 1000,155"
                                  fill="none"
                                  stroke="#a4f99c"
                                  stroke-width="1"
                                  stroke-linecap="round" />
                        </g>

                        <!-- Multiple overlapping thin lines for the fine detail texture visible in the original -->
                        <g opacity="0.4">
                            <path d="M0,127 C100,87 200,187 300,147 C400,107 500,167 600,137 C700,107 800,177 900,147 C950,137 975,127 1000,147"
                                  fill="none"
                                  stroke="#70e85d"
                                  stroke-width="0.5"
                                  stroke-linecap="round" />
                        </g>

                        <!-- Bottom thicker wave for the base -->
                        <g opacity="0.3">
                            <path d="M0,180 C100,160 200,250 300,200 C400,150 500,260 600,210 C700,160 800,270 900,220 C950,210 975,200 1000,210"
                                  fill="none"
                                  stroke="#a4f99c"
                                  stroke-width="40"
                                  stroke-linecap="round" />
                        </g>
                    </svg>
                </div>
                  <div v-html="formattedContent"></div>
                  <div class="unlock-message" v-if="currentNovelObject.quan === 0&&hui==''">
                    <p>已开放原文40%内容</p>
                    <p>
                      最低 0.01 元/天开通会员，
                      <a href="#" @click.prevent="unlockFullContent">查看完整内容</a>
                      <el-icon><ArrowRight /></el-icon>
                    </p>
                  </div>
                </div>
                </div>
              </transition>
            <WingDecoration v-if="contentLoading && (wingDisplayMode === 2 || wingDisplayMode === 3 || wingDisplayMode === 4)"/> <!-- 添加右侧翅膀组件 -->
            </div> <!-- End of content-flex-container -->
          </div>
        <div class="content-footer">
          <el-button-group>
            <el-button type="primary" plain icon="el-icon-arrow-left" @click="last">上一章</el-button>
            <el-button type="primary" plain icon="el-icon-arrow-right" @click="next">下一章</el-button>

          </el-button-group>
          <div class="reading-info">
            <div class="reading-time">
              <i class="el-icon-time"></i>
              <span>阅读时间: {{ readingTimeText }}</span>

            </div>
            <div class="font-info">
              <i class="el-icon-notebook-2"></i>
              <span>当前字体: {{ fontNames[selectedFontKey] || '默认' }}</span>
            </div>
            <div class="text-color-info">
              <i class="el-icon-edit-outline"></i>
              <span>文字颜色: {{ colorNames[selectedTextColor] || '默认' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// import axios from 'axios'; // 如果直接使用 axios
import request from "../utils/request"; // 假设这是您封装的请求工具
// 如果您使用的是 Element Plus，并希望显式导入图标：
import { Minus, Plus, Fold, Expand, CaretLeft, CaretRight, Lock, ArrowRight } from '@element-plus/icons-vue';
import WingDecoration from './WingDecoration.vue';
import WingDecorationLeft from './WingDecorationLeft.vue'; // 导入左侧翅膀组件
import Vip from "./VIP.vue";
import ParentComponent from "./VIP3.vue"; // 导入父组件
import gsap from 'gsap'; // 导入 GSAP
import { useUserStore } from '../stores/user'; // 导入用户store
export default {
  name: 'NovelSimple',
  components: {
    Minus,
    Plus,
    Fold,
    Expand,
    CaretLeft,
    CaretRight,
    Lock,
    ArrowRight,
    WingDecoration, // 注册 WingDecoration 组件
    WingDecorationLeft ,// 注册左侧翅膀组件,
    Vip,
    ParentComponent,


  }, // 如果显式导入图标，请取消注释
  data() {
    return {
      novelList: [], // 初始化为空，将由 API 填充
      currentIndex: 0,
      isCatalogVisible: true, // 控制目录显示/隐藏
      searchQuery: '',
      readingProgress: 0,
      readingTime: 0,
      theme: 'light',
      currentName:"",
      hui:"",
      fontSize: 16,
      curzhang: 1,
      selectedFontKey: 'default',
      selectedTextColor: 'default',
      textColor: '', // 实际应用的文本颜色
      textColors: {
        default: '',
        black: '#000000',
        darkgrey: '#444444',
        darkblue: '#003366',
        green: '#006633',
        brown: '#663300',
        purple: '#660066',
        custom: '#409EFF'
      },
      colorNames: {
        default: '默认颜色',
        black: '黑色',
        darkgrey: '深灰色',
        darkblue: '深蓝色',
        green: '绿色',
        brown: '棕色',
        purple: '紫色',
        custom: '自定义颜色'
      },
      fontFamilies: {
        default: "'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif",
        songti: "宋体, SimSun, serif",
        kaiti: "楷体, KaiTi, cursive",
        yahei: "'Microsoft YaHei', '微软雅黑', sans-serif",
        fangsong: "仿宋, FangSong, serif",
        xingkai: "'华文行楷', 'STXingkai', '行楷', cursive",
        xingcao: "'华文行草', 'STXingcao', '行草', cursive"
      },
      fontNames: {
        default: "默认字体",
        songti: "宋体",
        kaiti: "楷体",
        yahei: "微软雅黑",
        fangsong: "仿宋",
        xingkai: "行楷",
        xingcao: "行草"
      },
      timer: null,
      showFontPreview: false,
      contentLoading: false,
      error: false,
      errorMessage: '',
      novelContent: '',
      scrollThrottleTimeout: null,
      wingDisplayMode: -1 // -1: 不显示, 0,1: 左翅膀, 2,3: 右翅膀, 4: 同时显示
    };
  },
  computed: {



    currentNovelObject() {
      return this.novelList[this.currentIndex] || {};
    },
    currentTitle() {
      return this.currentNovelObject.title || '未知书籍';
    },
    currentPath() {
      // 注意：如果 novelList 的项没有 path 属性，这里会是 undefined
      return this.currentNovelObject.path;
    },
    currentChapterTitle() {
      // 通常章节标题是小说标题，或者可以从 novelContent 中提取
      return this.currentNovelObject.title || '';
    },
    filteredNovels() {
      if (!this.searchQuery) {
        return this.novelList;
      }
      const query = this.searchQuery.toLowerCase();
      return this.novelList.filter(novel =>
        novel.title.toLowerCase().includes(query)
      );
    },
    readingTimeText() {
      const minutes = Math.floor(this.readingTime / 60);
      const seconds = this.readingTime % 60;
      return `${minutes}分${seconds}秒`;
    },
    selectedFont() {
      return this.fontFamilies[this.selectedFontKey];
    },
    formattedContent() {
      if (!this.novelContent) return '';
      const appliedColor = this.textColor || (this.theme === 'dark' ? this.textColors.darkgrey : this.textColors.black);
      const paragraphs = this.novelContent
        .split('\n')
        .filter(line => line.trim())
        .map(para => `<p style="text-align: left; text-indent: 2em; color: ${appliedColor} !important;">${para}</p>`);
      // Wrap each paragraph and add animation delay
      return paragraphs.map((para, index) => {
        const delay = index * 0.05; // 50ms delay per paragraph
        return `<div style="animation: fadeInSlideUp 0.8s ease-out forwards; animation-delay: ${delay}s;">${para}</div>`;
      }).join('');
    }
  },
  methods: {
    getOriginalIndex(novelInFilteredList) {
      return this.novelList.findIndex(item => item.title === novelInFilteredList.title);
    },
    selectNovel(originalIndex) {
      if (originalIndex === -1 || originalIndex >= this.novelList.length) {
        console.error("选中的小说索引无效:", originalIndex);
        return;
      }
      this.currentIndex = originalIndex;
      // Reset scroll position to top when selecting a new novel
      if (this.$refs.contentBody) {
        this.$refs.contentBody.scrollTop = 0;
      }
      // Clear saved reading progress for the newly selected novel
      const key = `reading_progress_${this.currentIndex}_${this.curzhang}`;
      localStorage.removeItem(key);
      this.readingProgress = 0;
      this.readingTime = 0;
      this.error = false;
      this.errorMessage = '';
      this.curzhang = this.currentIndex + 1; // 章节号通常从1开始
      this.startReadingTimer();
      this.searchQuery = ''; // 清空搜索，使 filteredNovels 恢复为 novelList
      this.loadNovelContent();
    },
    toggleCatalog() {
      this.isCatalogVisible = !this.isCatalogVisible;
      this.$nextTick(() => {
        // Removed createStars call
      });
    },
    changeTheme(theme) {
      this.theme = theme;
      this.$nextTick(() => {
        // Removed createStars call
      });
    },
    changeFont(fontKey) {
      if (fontKey === 'preview') {
        this.showFontPreview = true;
      } else {
        this.selectedFontKey = fontKey;
        if (this.showFontPreview) {
          setTimeout(() => {
            this.showFontPreview = false;
          }, 1500);
        }
      }
    },
    changeTextColor(colorKey) {
      if (colorKey === 'custom') {
        this.$prompt('请输入十六进制颜色代码', '自定义颜色', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: this.textColors.custom,
          inputPattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
          inputErrorMessage: '颜色格式不正确，应为#RRGGBB或#RGB'
        }).then(({ value }) => {
          this.textColors.custom = value;
          this.selectedTextColor = 'custom';
          this.textColor = value;
          this.$message({
            type: 'success',
            message: '颜色已设置为 ' + value
          });
        }).catch(() => {
          this.$message({
            type: 'info',
            message: '已取消颜色设置'
          });
        });
      } else {
        this.selectedTextColor = colorKey;
        this.textColor = this.textColors[colorKey];
      }
    },
    increaseFontSize() {
      if (this.fontSize < 24) {
        this.fontSize += 1;
      }
    },
    decreaseFontSize() {
      if (this.fontSize > 12) {
        this.fontSize -= 1;
      }
    },
    startReadingTimer() {
      if (this.timer) {
        clearInterval(this.timer);
      }
      this.timer = setInterval(() => {
        this.readingTime++;
      }, 1000);
    },
    last() {
      if (this.curzhang > 1) {
        this.curzhang--;
        this.currentIndex = this.curzhang - 1;
        // Clear reading progress and time for the new chapter
        const key = `reading_progress_${this.currentIndex}_${this.curzhang}`;
        localStorage.removeItem(key);
        this.readingProgress = 0;
        this.readingTime = 0;
        this.startReadingTimer(); // Restart timer for the new chapter
        this.loadNovelContent();
      } else {
        this.$message({
          message: '已经是第一章了',
          type: 'warning'
        });
      }
    },
    next() {
      if (this.curzhang < this.novelList.length) {
        this.curzhang++;
        this.currentIndex = this.curzhang - 1;
        // Clear reading progress and time for the new chapter
        const key = `reading_progress_${this.currentIndex}_${this.curzhang}`;
        localStorage.removeItem(key);
        this.readingProgress = 0;
        this.readingTime = 0;
        this.startReadingTimer(); // Restart timer for the new chapter
        this.loadNovelContent();
      } else {
        this.$message({
          message: '已经是最后一章了',
          type: 'warning'
        });
      }
    },
    percentFormat(percentage) {
      return percentage.toFixed(2) + '%';
    },
    updateReadingProgress() {
      if (!this.$refs.contentBody) return;
      const el = this.$refs.contentBody;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;
      if (scrollHeight > clientHeight) {
        const maxScrollTop = scrollHeight - clientHeight;
        const progress = (scrollTop / maxScrollTop) * 100;
        this.readingProgress = parseFloat(progress.toFixed(2));
      } else {
        this.readingProgress = 100;
      }
      this.saveReadingProgress();
    },
    throttledScrollHandler() {
      if (this.scrollThrottleTimeout) return;
      this.scrollThrottleTimeout = setTimeout(() => {
        this.updateReadingProgress();
        this.scrollThrottleTimeout = null;
      }, 100);
    },
    saveReadingProgress() {
      try {
        const key = `reading_progress_${this.currentIndex}_${this.curzhang}`;
        localStorage.setItem(key, this.readingProgress.toString());
      } catch (e) {
        console.error('保存阅读进度失败:', e);
      }
    },
    restoreReadingProgress() {
      try {
        const key = `reading_progress_${this.currentIndex}_${this.curzhang}`;
        const progress = localStorage.getItem(key);
        if (progress) {
          const progressValue = parseFloat(progress);
          this.readingProgress = progressValue;
          this.$nextTick(() => {
            if (this.$refs.contentBody) {
              const el = this.$refs.contentBody;
              const scrollHeight = el.scrollHeight;
              const clientHeight = el.clientHeight;
              if (scrollHeight > clientHeight) {
                const maxScrollTop = scrollHeight - clientHeight;
                const scrollTop = (progressValue / 100) * maxScrollTop;
                el.scrollTop = scrollTop;
              }
            }
          });
        }
      } catch (e) {
        console.error('恢复阅读进度失败:', e);
      }
    },
    loadNovelContent() {

      this.contentLoading = true;
      this.novelContent = ''; // Clear previous content

      // Generate random number for wing display mode
      this.wingDisplayMode = Math.floor(Math.random() * 5); // 0, 1, 2, 3, or 4

      // Ensure curzhang is valid
      if (this.curzhang < 1 || (this.novelList.length > 0 && this.curzhang > this.novelList.length)) {
        console.warn("请求的章节号无效:", this.curzhang);
        this.contentLoading = false;
        this.error = true;
        this.errorMessage = '请求的章节无效。';
        this.$nextTick(() => {
          /* Removed createStars call */
        }); // Even on error, try to create background
        return;
      }
      request.post(`/deal/getnovel?a=${this.curzhang}&&b=${this.hui}`).then(res => {
        this.novelContent = res.data; // Load content directly from backend response
        this.contentLoading = false;
        this.error = false;
        // Add a small delay to allow DOM to settle before calculating height and restoring scroll
        setTimeout(() => {
          this.$nextTick(() => {
            console.log('Inside nextTick after loadNovelContent'); // Added console log
            this.restoreReadingProgress();
            // Removed createStars call
          });
        }, 300); // Increased delay to 300ms
      }).catch(error => {
        console.error('加载小说内容失败:', error);
        this.error = true;
        this.errorMessage = '无法加载小说内容，请稍后重试。';
        this.contentLoading = false;
        this.$nextTick(() => {
          // Removed createStars call
        });
      }).finally(() => {
        // Ensure animation is applied after loading state changes and DOM updates
        this.$nextTick(() => {
          this.applyLoadingAnimation();
        });
      });
    },
    applyLoadingAnimation() {
      // Find all character spans within the loading text
      const charElements = this.$el.querySelectorAll('.loading-text .loading-char');
      const loadingTextElement = this.$el.querySelector('.loading-text');

      if (!loadingTextElement) return; // Guard against null element

      const containerWidth = loadingTextElement.offsetWidth;
      const containerHeight = loadingTextElement.offsetHeight;

      charElements.forEach((char, index) => {
        // Calculate random start and mid positions relative to the container
        const startX = (Math.random() - 0.5) * containerWidth * 2; // Start from outside the container horizontally
        const startY = (Math.random() - 0.5) * containerHeight * 2; // Start from outside the container vertically
        const startRotate = (Math.random() - 0.5) * 360; // Random initial rotation

        const midX = (Math.random() - 0.5) * containerWidth * 0.5; // Float slightly within the container
        const midY = (Math.random() - 0.5) * containerHeight * 0.5; // Float slightly within the container
        const midRotate = (Math.random() - 0.5) * 60; // Random intermediate rotation

        const delay = index * 0.05 + Math.random() * 0.5; // Staggered delay with some randomness

        char.style.setProperty('--start-x', `${startX}px`);
        char.style.setProperty('--start-y', `${startY}px`);
        char.style.setProperty('--start-rotate', `${startRotate}deg`);
        char.style.setProperty('--mid-x', `${midX}px`);
        char.style.setProperty('--mid-y', `${midY}px`);
        char.style.setProperty('--mid-rotate', `${midRotate}deg`);
        char.style.animationDelay = `${delay}s`;
      });
    },
    jumpToChapter(chapterIndex) {
      if (chapterIndex < 1 || chapterIndex > this.novelList.length) {
        this.$message({
          message: '无效的章节号',
          type: 'error'
        });
        return;
      }
      this.curzhang = chapterIndex;
      this.currentIndex = chapterIndex - 1;
      this.readingProgress = 0;
      this.readingTime = 0;
      this.startReadingTimer();
      this.loadNovelContent();
    },
    createStars() {
      console.log('createStars function called');
      const starContainer = this.$refs.headerStarContainer; // Use headerStarContainer ref
      console.log('headerStarContainer ref:', starContainer);
      if (!starContainer) {
        console.log('headerStarContainer ref is null, cannot create stars.');
        return;
      }
      starContainer.innerHTML = ''; // Clear previous stars
      const numberOfStars = 80; // Reduced number of stars for header
      const containerWidth = starContainer.offsetWidth;
      const containerHeight = starContainer.offsetHeight;
      console.log('Header star container dimensions:', containerWidth, 'x', containerHeight);

      if (containerWidth === 0 || containerHeight === 0) {
        console.log('Header star container has zero dimensions, cannot create stars.');
        return;
      }

      for (let i = 0; i < numberOfStars; i++) {
        const star = document.createElement('div');
        star.classList.add('star-particle');

        const shapeType = Math.floor(Math.random() * 4); // 0: circle, 1: triangle, 2: diamond, 3: square
        let size = (Math.random() * 2 + 1) * 2; // Base size

        switch (shapeType) {
          case 0: // Circle
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.borderRadius = '50%';
            break;
          case 1: // Triangle
            star.classList.add('triangle');
            size = (Math.random() * 2 + 1) * 3; // Adjust size for triangles
            star.style.width = '0';
            star.style.height = '0';
            star.style.borderLeft = `${size / 2}px solid transparent`;
            star.style.borderRight = `${size / 2}px solid transparent`;
            star.style.borderBottom = `${size}px solid`; // Color will be set later
            break;
          case 2: // Diamond
            star.classList.add('diamond');
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.transform = 'rotate(45deg)';
            break;
          case 3: // Square
            star.classList.add('square');
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            break;
        }


        star.style.left = `${Math.random() * containerWidth}px`;
        star.style.top = `${Math.random() * containerHeight}px`;

        const duration = Math.random() * 2 + 1; // Animation duration 1s to 3s
        const delay = Math.random() * 2; // Animation delay up to 2s

        star.style.animationName = 'twinkle'; // Use twinkle animation
        star.style.animationDuration = `${duration}s`;
        star.style.animationDelay = `${delay}s`;
        star.style.animationTimingFunction = 'ease-in-out';
        star.style.animationIterationCount = 'infinite';
        // Generate random color for each star
        const randomColor = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.8)`;

        // Apply color based on shape
        if (shapeType === 1) { // Triangle uses border-bottom color
             star.style.borderBottomColor = randomColor;
        } else { // Other shapes use background-color
             star.style.backgroundColor = randomColor;
        }

        starContainer.appendChild(star);
        this.animateStar(star); // 应用移动动画
      }
      console.log(`Created ${numberOfStars} star particles in header.`);
    },
    animateStar(star) {
        // 使用 gsap.fromTo 定义移动动画，从当前位置到随机目标位置
        gsap.fromTo(star,
          { // From (current position set by left/top)
            x: 0,
            y: 0
          },
          { // To (random target position)
            x: Math.random() * 200 - 100, // 随机水平移动 -100px 到 100px
            y: Math.random() * 100 - 50, // 随机垂直移动 -50px 到 50px
            duration: Math.random() * 10 + 5, // 较慢的移动速度 (5-15s)
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }
        );
    },
    handleResize() {
      this.updateReadingProgress();
      this.createStars(); // Recreate stars on window resize
    },
    unlockFullContent() {
      // This method would handle the logic for unlocking content,
      // e.g., navigating to a payment page or showing a modal.
      // For now, it just shows a message.
      this.$message({
        message: '此功能尚未实现，请联系伟大的张先生解锁完整内容。',
        type: 'info'
      });
      // In a real application, you would redirect or show a payment flow here.
      // Example: this.$router.push('/unlock-premium');
    },
  },
  mounted() {
     const routeName = this.$route.query.name;
    if (routeName != null) {
      this.currentName = routeName.toString();

      console.log("从路由获取到的名字:", this.currentName); // 添加日志确认获取到的值
    } else {
       console.log("路由中没有找到名字参数"); // 添加日志
    }

    console.log('小说阅读器已加载');
    this.startReadingTimer();
    this.$nextTick(() => {
      this.createStars(); // Create stars after DOM is mounted
    });
    
    // 修复：使用当前登录用户的username获取VIP状态，而不是小说名称
    const userStore = useUserStore();
    const username = userStore.username || localStorage.getItem('username') || '';
    if (username) {
      request.post("/deal/gethui?b=" + username).then(res => {
        this.hui = res.data;
        console.log("获取VIP状态:", this.hui, "用户名:", username); // 添加日志
      }).catch(error => {
        console.error("获取VIP状态失败:", error);
      });
    } else {
      console.warn("未找到用户名，无法获取VIP状态");
    }




    request.post("/deal/getnovelzong").then(res => {
      this.novelList = res.data;
      if (this.novelList && this.novelList.length > 0) {
        // 尝试根据 currentName 查找对应的小说索引
        const foundIndex = this.novelList.findIndex(novel => novel.title === this.currentName);
        if (foundIndex !== -1) {
          this.currentIndex = foundIndex;
          console.log("根据名字找到对应小说索引:", this.currentIndex); // 添加日志
        } else {
          // 如果没有找到，则使用默认的第一个
          this.currentIndex = 0;
          console.log("未根据名字找到对应小说，使用默认索引 0"); // 添加日志
        }

        this.curzhang = this.currentIndex + 1;
        this.loadNovelContent();
      } else {
        this.contentLoading = false;
      }
    }).catch(error => {
      console.error("获取小说列表失败:", error);
      this.contentLoading = false;
      this.error = true;
      this.errorMessage = "获取小说列表失败，请检查网络或刷新页面。";
    });
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.scrollThrottleTimeout) {
      clearTimeout(this.scrollThrottleTimeout);
    }
  }
};
</script>

<style scoped>
/* Fade transition for content */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Animation for floating in text */
@keyframes fadeInSlideUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Twinkle animation for stars */
@keyframes twinkle {
  0%,
  100% {
    opacity: 0.8;
  }
  50% {
    opacity: 0.2;
  }
}

.novel-reader {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #a8dadc 0%, #457b9d 100%);
  font-family: 'Serif', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
}

.reader-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 40px;
  background: linear-gradient(90deg, #bbdefb 0%, #e1f5fe 100%);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
  border-radius: 0 0 24px 24px;
  position: relative;
  z-index: 10;
  overflow: hidden; /* Ensure stars are clipped to header bounds */
}

.header-star-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Allow clicks to pass through */
  z-index: 0; /* Behind header content */
}

/* Styles for different star shapes */
.star-particle.triangle {
  /* Shape is created by borders, size is controlled by border-width in JS */
  /* Color is applied via border-bottom-color in JS */
}

.star-particle.diamond {
  /* Shape is a square rotated 45 degrees */
  /* Size is controlled by width/height in JS */
  /* Color is applied via background-color in JS */
}

.star-particle.square {
  /* Default div shape */
  /* Size is controlled by width/height in JS */
  /* Color is applied via background-color in JS */
}

/* Common styles for star particles */
.star-particle {
  position: absolute;
  /* background-color: rgba(255, 0, 0, 0.8); /* Base color removed, set in JS */
  /* border-radius: 50%; /* Base border-radius removed, set for circle in JS */
  pointer-events: none; /* Allow clicks to pass through */
}

.site-title {
  margin: 0;
  font-size: 30px;
  color: #4b3ca7;
  font-weight: bold;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  position: relative; /* Ensure title is above stars */
  z-index: 1;
}

.site-title::before {
  content: "📚";
  font-size: 32px;
  margin-right: 12px;
}

.header-controls {
  position: relative; /* Ensure controls are above stars */
  z-index: 1;
}

.header-controls .el-button,
.header-controls .el-dropdown {
  border-radius: 18px !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.08);
  transition: box-shadow 0.2s;
  margin-left: 8px;
}

.header-controls .el-button:hover,
.header-controls .el-dropdown:hover {
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.18);
}

.reader-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  background-size: 200% 200%;
  animation: subtle-background-move 30s ease infinite alternate;
  flex-direction: row; /* Changed to row for catalog on left */
}

@keyframes subtle-background-move {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 100% 100%;
  }
}

.catalog-toggle-bar {
  width: 30px;
  height: 60px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: #e0e7ef;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  border-radius: 0 8px 8px 0;
  z-index: 5;
}

.catalog-toggle-bar:hover {
  background-color: #c2e9fb;
}

.catalog-toggle-bar .el-icon {
  font-size: 18px;
  color: #4b3ca7;
}

.catalog-panel {
  width: 260px;
  background: var(--bg-color);
  border-right: 1px solid var(--border-color);
  border-radius: 24px 0 0 24px;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.catalog-panel.hidden {
  width: 0;
  overflow: hidden;
  border-right: none;
}

.catalog-header {
  padding: 28px 24px 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: #f0f4fa;
  border-radius: 24px 0 0 0;
}

.catalog-header h2 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: var(--text-color);
  text-align: center;
  font-weight: 600;
}

.catalog-header .el-input {
  margin-top: 8px;
}

.catalog-header .el-input :deep(.el-input__inner) {
  border-radius: 18px;
  padding-left: 35px;
}

.novel-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
  align-items: flex-start;
}

.novel-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  cursor: pointer;
  border-left: 4px solid transparent;
  border-radius: 0 16px 16px 0;
  transition: background 0.2s, border-color 0.2s, transform 0.1s;
  text-align: left;
  margin-bottom: 4px;
}

.vip-badge {
  display: inline-block;
  background-color: #FFD700; /* Golden background */
  color: #C0C0C0; /* Silver text */
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px; /* Adjust as needed */
  font-weight: bold;
  margin-right: 8px; /* Space between badge and title */
  position: relative; /* Needed for absolute positioning of pseudo-elements */
  z-index: 1; /* Ensure badge is above pseudo-elements */
  overflow: visible; /* Allow pseudo-elements outside the border-box */
}

.vip-badge::before,
.vip-badge::after {
  content: '';
  position: absolute;
  left: 50%; /* Center horizontally relative to the badge */
  width: 100%; /* Match badge width */
  height: 2px; /* Adjust height for the arc */
  border: none; /* Remove full border */
  border-top: 2px solid #800080; /* Purple top border */
  z-index: -1; /* Place behind the badge */
  box-sizing: border-box; /* Include border in size calculation */
  transform: translateX(-50%); /* Center horizontally */
  /* Use border-radius to create an arc shape */
  border-radius: 0 0 100% 100% / 0 0 0px 0px; /* Adjust values for arc shape */
}

.vip-badge::before {
  top: 0px; /* Position tightly above the badge */
  border-color: #800080 transparent transparent transparent; /* Only top border */
  border-radius: 0 0 100% 100% / 0 0 0px 0px; /* Top arc */
}

.vip-badge::after {
  bottom: 0px; /* Position tightly below the badge */
  border-color: transparent transparent #800080 transparent; /* Only bottom border */
  border-radius: 100% 100% 0 0 / 0px 0px 0 0; /* Bottom arc */
}

/* Remove the animation as it's not needed for the static look in the image */
/* @keyframes steep-wavy-border { ... } */


/* .vip-badge:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 215, 0, 0.8);
} */

.novel-item:hover {
  background: var(--highlight-color-light);
  transform: translateX(3px);
}


/* .vip-badge:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 215, 0, 0.8);
} */

.novel-item:hover {
  background: var(--highlight-color-light);
  transform: translateX(3px);
}

.novel-item.active {
  background: linear-gradient(90deg, var(--highlight-color-active) 0%, rgba(var(--highlight-color-active-rgb), 0.9) 100%);
  border-left: 6px solid var(--highlight-color);
  color: var(--highlight-color-text, #4b3ca7);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(var(--highlight-color-rgb, 0, 123, 255), 0.2);
}

.light .novel-item.active {
  --highlight-color-active-rgb: 204, 229, 255;
  --highlight-color-text: #007bff;
}

.dark .novel-item.active {
  --highlight-color-active-rgb: 51, 75, 102;
  --highlight-color-text: #5cb0ff;
}

.sepia .novel-item.active {
  --highlight-color-active-rgb: 230, 217, 185;
  --highlight-color-text: #9c6f44;
}

.eyecare .novel-item.active {
  --highlight-color-active-rgb: 196, 224, 202;
  --highlight-color-text: #5da566;
}

.novel-item i {
  margin-right: 10px;
  font-size: 18px;
}

.novel-title {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: 16px;
  line-height: 1.5;
  margin-right: 12px;
}

.lock-icon {
  font-size: 16px;
  color: var(--text-color-secondary);
}

.content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Reverted to hidden */
  background: var(--bg-color);
  border-radius: 0 24px 24px 0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
  color: var(--text-color);
  position: relative;
}

.content-header {
  padding: 35px 48px; /* 稍微增大上下内边距 */
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
  border-radius: 0 24px 0 0;
  color: var(--text-color);
  position: relative; /* Keep as relative */
  z-index: 2;
  display: flex; /* Keep as flex container */
  align-items: center; /* Vertical center */
  /* Removed justify-content: space-between; */
  min-height: 60px; /* Set minimum height */
}

.content-title {
  /* Removed position: absolute; left: 50%; transform: translateX(-50%); */
  margin: 0; /* Remove auto margin */
  font-size: 26px;
  color: #4b3ca7;
  font-weight: bold;
  letter-spacing: 1px;
  flex-grow: 1; /* Allow title to take up available space */
  /* Removed text-align: center; */
  display: flex; /* Keep as flex container for badge and text */
  align-items: center; /* Vertical center */
  /* Removed justify-content: center; /* Horizontal center */
  /* Removed padding-left: 800px; */
}

.title-and-badge {
  display: flex;
  align-items: center; /* 垂直居中对齐 */
  /* Removed justify-content: center; */
  /* Removed width: 100%; */
  gap: 5px; /* 减小徽章和文本之间的间距 */
  /* Removed margin-right: auto; */
  /* Removed width: 150px; */
  /* Removed flex-shrink: 0; */
}

.title-and-badge .badge-container { /* Targeting the badge container */
  margin-right: 15px; /* Add right margin for spacing */
  /* Removed width: 50px; */
  /* Removed overflow: hidden; */
}

.font-preview {
  margin-bottom: 15px;
  background-color: rgba(249, 249, 249, 0.9);
  border-radius: 4px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .font-preview {
  background-color: rgba(40, 40, 40, 0.9);
}

.sepia .font-preview {
  background-color: rgba(240, 230, 210, 0.9);
}

.eyecare .font-preview {
  background-color: rgba(220, 240, 220, 0.9);
}

.preview-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  color: var(--text-color);
  text-align: center;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 10px;
}

.preview-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.preview-item {
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--bg-color);
}

.preview-item:hover {
  background-color: var(--highlight-color-light, #f5f7fa);
  transform: translateY(-2px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.preview-item.active {
  background-color: var(--highlight-color-active, #ecf5ff);
  border-color: var(--highlight-color);
}

.preview-name {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: var(--text-color);
}

.preview-text {
  display: block;
  color: var(--text-color);
  font-size: 16px;
  text-align: center;
  line-height: 1.5;
}

.preview-actions {
  margin-top: 15px;
  text-align: center;
}

.reading-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.reading-progress span {
  width: 80px;
  color: var(--text-color-secondary, #606266);
  font-size: 14px;
}

.reading-progress :deep(.el-progress-bar__innerText) {
  font-size: 12px;
  color: var(--text-color, #303133);
  font-weight: bold;
}

.reading-progress :deep(.el-progress__text) {
  font-size: 14px !important;
  color: var(--highlight-color, #409EFF);
  font-weight: bold;
  margin-left: 5px;
}

.content-body {
  overflow-y: auto;
  padding: 40px 56px;
  background: transparent;
  line-height: 2.0;
  color: var(--text-color);
  position: relative;
  z-index: 1; /* Keep z-index 1 */
}

.star-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 0; /* Changed z-index to 0 */
  animation: pulse-bg 20s ease-in-out infinite alternate;
}

@keyframes pulse-bg {
  0% {
    opacity: 0.9;
  }
  100% {
    opacity: 1;
  }
}

/* Styles for curved border lines using box-shadow */
.novel-content {
  position: relative;
  z-index: 1; /* Ensure content background is above star-bg, decorative borders will be children */
  max-width: 820px;
  margin: 0 auto;
  background: var(--bg-color-content, var(--bg-color)); /* Actual text background */
  border-radius: 20px; /* This is the main visual radius of the content area */
  padding: 60px 48px; /* Generous padding for text AND decorative lines inside */
  /* overflow: hidden; */ /* Can be kept if lines are inside padding, or removed if lines is outside */
}

/* Styles for gold border with blue glow */
.novel-content {
  position: relative;
  z-index: 1; /* Ensure content background is above star-bg, decorative borders will be children */
  max-width: 820px;
  margin: 0 auto;
  background: var(--bg-color-content, var(--bg-color)); /* Actual text background */
  /* padding: 60px 48px; */ /* Generous padding for text AND decorative lines inside */
  /* overflow: hidden; */ /* Can be kept if lines are inside padding, or removed if lines is outside */
  border: 2px solid #FFD700; /* Gold border - Adjusted thickness */
  box-shadow: 0 0 15px 5px rgba(0, 191, 255, 0.6); /* Blue glow effect */
  border-radius: 20px; /* Ensure border-radius is applied */
}

/* Styles for faint star pattern outside the blue glow */
.novel-content::before {
  content: '';
  position: absolute;
  top: -10px; /* Position slightly outside the blue glow */
  left: -10px; /* Position slightly outside the blue glow */
  width: calc(100% + 20px); /* Extend width */
  height: calc(100% + 20px); /* Extend height */
  border-radius: 25px; /* Slightly larger radius to match outer edge */
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.3) 1px, transparent 1px); /* Faint white stars */
  background-size: 20px 20px; /* Spacing of stars */
  z-index: -2; /* Behind the blue glow and content */
  pointer-events: none; /* Allow clicks to pass through */
}
/* END OF STYLES FOR GOLD BORDER WITH BLUE GLOW */

.light .novel-content {
  background: rgba(255, 255, 255, 0.90);
}

.dark .novel-content {
  background: rgba(26, 26, 26, 0.92);
}

.sepia .novel-content {
  background: rgba(245, 242, 233, 0.90);
}

.eyecare .novel-content {
  background: rgba(228, 241, 230, 0.90);
}

.chapter-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 24px;
  color: var(--text-color);
  text-align: left;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 10px;
  animation: slideInFadeIn 0.6s ease-out;
}

@keyframes slideInFadeIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.novel-content p {
  margin-bottom: 24px;
  text-indent: 2em;
  text-align: left;
  font-size: 18px;
  letter-spacing: 1px;
  line-height: 2.0;
}

.unlock-message {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px dashed var(--border-color);
  color: var(--text-color-secondary);
  font-size: 15px;
}

.unlock-message a {
  color: var(--highlight-color);
  text-decoration: none;
  font-weight: bold;
  margin-left: 5px;
  display: inline-flex;
  align-items: center;
}

.unlock-message a:hover {
  text-decoration: underline;
}

.unlock-message .el-icon {
  margin-left: 3px;
  font-size: 14px;
}

.content-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 48px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
  border-radius: 0 0 24px 24px;
  position: relative;
  z-index: 2;
}

.reading-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-color-info, #f0f4fa);
  border-radius: 12px;
  padding: 10px 18px;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.06);
}

.reading-time,
.font-info,
.text-color-info {
  display: flex;
  align-items: center;
  color: var(--text-color-secondary, #909399);
  font-size: 14px;
}

.reading-time i,
.font-info i,
.text-color-info i {
  margin-right: 5px;
}

/* Theme style variables */
.light {
  --bg-color: #f8f9fa;
  --bg-color-info: #e9ecef;
  --text-color: #343a40;
  --text-color-secondary: #6c757d;
  --border-color: #dee2e6;
  --highlight-color: #007bff;
  --highlight-color-light: #e9f5ff;
  --highlight-color-active: #cce5ff;
  --star-color: rgba(0, 123, 255, 0.6);
  --highlight-color-rgb: 0, 123, 255;
}

.dark {
  --bg-color: #1a1a1a;
  --bg-color-info: #2c2c2c;
  --text-color: #e0e0e0;
  --text-color-secondary: #a0a0a0;
  --border-color: #333333;
  --highlight-color: #5cb0ff;
  --highlight-color-light: #2a3a4a;
  --highlight-color-active: #334b66;
  --star-color: rgba(200, 220, 255, 0.6);
  --highlight-color-rgb: 92, 176, 255;
}

.sepia {
  --bg-color: #f5f2e9;
  --bg-color-info: #e9e2d0;
  --text-color: #5f4b32;
  --text-color-secondary: #8c735a;
  --border-color: #d3c6a6;
  --highlight-color: #9c6f44;
  --highlight-color-light: #f0e5c9;
  --highlight-color-active: #e6d9b9;
  --star-color: rgba(180, 150, 100, 0.7);
  --highlight-color-rgb: 156, 111, 68;
}

.eyecare {
  --bg-color: #e4f1e6;
  --bg-color-info: #d8ebd9;
  --text-color: #3a4a3f;
  --text-color-secondary: #5c7a63;
  --border-color: #c9e0cc;
  --highlight-color: #5da566;
  --highlight-color-light: #d4eada;
  --highlight-color-active: #c4e0ca;
  --star-color: rgba(100, 160, 100, 0.6);
  --highlight-color-rgb: 93, 165, 102;
}

.dark .el-button--primary.is-plain {
  color: var(--highlight-color);
  background: #262626;
  border-color: #444;
}

.dark .el-button--primary.is-plain:hover,
.dark .el-button--primary.is-plain:focus {
  color: #fff;
  background: var(--highlight-color);
  border-color: var(--highlight-color);
}

.dark .el-input__inner {
  background-color: #2c2c2c;
  border-color: #444;
  color: var(--text-color);
}

.dark .el-dropdown-menu {
  background-color: #2c2c2c;
  border-color: #444;
}

.dark .el-dropdown-menu__item {
  color: var(--text-color);
}

.dark .el-dropdown-menu__item:hover {
  background-color: #383838;
  color: var(--highlight-color);
}

.dark .el-progress-bar__outer {
  background-color: #333;
}

.loading-container,
.error-container {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-color-secondary);
}

.loading-text {
  margin-top: 20px;
  font-size: 18px;
  position: relative;
  height: 1.5em;
  overflow: hidden;
  text-align: center;
}

.loading-char {
  display: inline-block;
  position: absolute;
  opacity: 0;
  animation: floatIn 2s ease-out forwards;
}

@keyframes floatIn {
  0% {
    opacity: 0;
    transform: translate(var(--start-x, 0), var(--start-y, 50px)) rotate(var(--start-rotate, 0deg));
  }
  50% {
    opacity: 0.8;
    transform: translate(var(--mid-x, 0), var(--mid-y, -10px)) rotate(var(--mid-rotate, 10deg));
  }
  100% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg);
  }
}

.error-container i {
  font-size: 48px;
  margin-bottom: 20px;
  color: #f56c6c;
}

.dark .error-container i {
  color: #ff7878;
}

.error-message {
  margin-bottom: 20px;
  font-size: 16px;
  color: var(--text-color);
}

.wave-container {
    width: 100%;
    /* height: 20px; /* Adjusted height */
    position: relative;
    margin-bottom: 24px; /* Add margin below the wave */
}

svg {
    width: 100%;
    height: 100%;
}

.content-flex-container {
  display: flex; /* Make it a flex container */
  align-items: flex-start; /* Align items to the top */
  gap: 20px; /* Add some space between content and wing */
}

.content-flex-container .novel-content {
  flex-grow: 1; /* Allow novel content to take up available space */
  max-width: none; /* Remove max-width to allow flex-grow to work */
  margin: 0; /* Remove margin auto */
}


@media (max-width: 768px) {
  .reader-header {
    padding: 10px 15px;
    flex-direction: column;
    align-items: flex-start;
  }
  .site-title {
    font-size: 24px;
    margin-bottom: 10px;
  }
  .site-title::before {
    font-size: 26px;
  }
  .header-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    justify-content: space-around;
  }
  .header-controls .el-dropdown,
  .header-controls .el-button-group {
    margin-left: 0;
  }
  .reader-container {
    flex-direction: column;
  }
  .catalog-panel {
    width: 100%;
    height: auto;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    border-radius: 0;
  }
  .catalog-header {
    border-radius: 0;
  }
  .content-panel {
    border-radius: 0;
  }
  .content-header {
    padding: 20px 15px 10px;
    border-radius: 0;
  }
  .content-title {
    font-size: 20px;
  }
  .content-body {
    padding: 15px;
  }
  .novel-content {
    padding: 40px 25px;
    margin: 0 5px;
  }
  .chapter-title {
    font-size: 18px;
  }
  .novel-content p {
    font-size: 16px;
  }
  .content-footer {
    flex-direction: column;
    gap: 10px;
    align-items: center;
    padding: 15px;
    border-radius: 0;
  }
  .reading-info {
    width: 100%;
    text-align: center;
  }
  .header-controls .el-dropdown-menu {
    z-index: 9999 !important;
    position: fixed !important;
    top: auto !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    bottom: 20px !important;
    max-height: 50vh;
    overflow-y: auto;
    width: 90%;
    max-width: 300px;
  }
}
.badge-container {
  position: relative;
  display: flex;
  justify-content: flex-start; /* 居左对齐 */
  align-items: center; /* 垂直居中 */
  overflow: visible; /* 防止裁剪 */
  height: auto; /* 自适应高度，避免影响目录栏 */
  flex-shrink: 0; /* Prevent shrinking */
  flex-basis: 0; /* Allow content to determine size */
  flex-grow: 1; /* 占 1/5 比例 */
}

.badge-container .vip-badge {
  transform: perspective(1500px) rotateX(15deg) rotateY(-15deg) scale(0.14286); /* 调整缩放比例 */
  transform-origin: center; /* 变换原点居中 */
}

.title-and-badge span { /* Targeting the span within title-and-badge */
  flex-grow: 4; /* 占 4/5 比例 */
  flex-basis: 0; /* Allow content to determine size */
}

.title-and-badge {
  display: flex;
  align-items: center; /* 垂直居中对齐 */
  justify-content: center; /* 水平居中对齐 */
  gap: 5px; /* 减小徽章和文本之间的间距 */
}
</style>
