<template>
  <div>
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="bg-card border border-border rounded-2xl p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-muted-foreground text-sm">{{ $t('home.stats.tasks') }}</span>
          <div class="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Download class="w-4 h-4 text-violet-500" />
          </div>
        </div>
        <div class="text-2xl font-bold text-foreground">{{ tasks.length }}</div>
        <div class="text-xs text-muted-foreground mt-1">
          {{ tasks.filter(t => t.status === 'completed').length }} {{ $t('home.stats.completed') }}
        </div>
      </div>

      <div class="bg-card border border-border rounded-2xl p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-muted-foreground text-sm">{{ $t('home.stats.tm') }}</span>
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isTampermonkeyAvailable ? 'bg-emerald-500/10' : 'bg-amber-500/10'">
            <Shield class="w-4 h-4" :class="isTampermonkeyAvailable ? 'text-emerald-500' : 'text-amber-500'" />
          </div>
        </div>
        <div class="text-2xl font-bold" :class="isTampermonkeyAvailable ? 'text-emerald-500' : 'text-amber-500'">
          {{ isTampermonkeyAvailable ? $t('home.stats.installed') : $t('home.stats.notInstalled') }}
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          {{ isTampermonkeyAvailable ? $t('home.stats.tmInstalledTip') : $t('home.stats.tmNotInstalledTip') }}
        </div>
      </div>

      <div class="bg-card border border-border rounded-2xl p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-muted-foreground text-sm">{{ $t('home.stats.currentStatus') }}</span>
          <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Activity class="w-4 h-4 text-blue-500" />
          </div>
        </div>
        <div class="text-2xl font-bold text-foreground">
          {{ isDownloading ? $t('home.stats.downloading') : $t('home.stats.ready') }}
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          {{ currentTask ? currentTask.progress + '%' : $t('home.stats.waiting') }}
        </div>
      </div>
    </div>

    <!-- Tampermonkey Banner -->
    <div v-if="!isTampermonkeyAvailable" class="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Zap class="w-6 h-6 text-amber-500" />
        </div>
        <div class="flex-1">
          <h3 class="text-foreground font-semibold mb-1">{{ $t('home.tmBanner.title') }}</h3>
          <p class="text-muted-foreground text-sm mb-4">
            {{ $t('home.tmBanner.desc') }}
          </p>
          <div class="flex gap-3">
            <a 
              href="https://www.tampermonkey.net/" 
              target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-sm font-medium rounded-lg transition-colors"
            >
              <Download class="w-4 h-4" />
              {{ $t('home.tmBanner.installBtn') }}
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Download Form -->
      <div class="bg-card border border-border rounded-2xl overflow-hidden">
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
            <Link class="w-5 h-5 text-violet-500" />
            {{ $t('home.form.title') }}
          </h2>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- URL Input -->
          <div>
            <label class="block text-sm font-medium text-muted-foreground mb-2">{{ $t('home.form.urlLabel') }}</label>
            <div class="relative">
              <textarea
                v-model="m3u8Url"
                rows="4"
                :placeholder="$t('home.form.urlPlaceholder')"
                class="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none font-mono text-sm"
              />
              <button
                v-if="m3u8Url"
                @click="m3u8Url = ''"
                class="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- File Name Input -->
          <div>
            <label class="block text-sm font-medium text-muted-foreground mb-2">{{ $t('home.form.nameLabel') }} <span class="text-red-500">{{ $t('home.form.nameRequired') }}</span></label>
            <input
              v-model="customFilename"
              type="text"
              :placeholder="$t('home.form.namePlaceholder')"
              class="w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm"
              :class="nameError ? 'border-red-500/60' : 'border-input'"
              @input="nameError = false"
            />
            <p v-if="nameError" class="mt-2 text-xs text-red-500">{{ $t('home.form.nameError') }}</p>
          </div>

          <!-- Options Toggle -->
          <div>
            <button
              @click="showOptions = !showOptions"
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <SlidersHorizontal class="w-4 h-4" />
              {{ $t('home.form.advanced') }}
              <ChevronDown class="w-4 h-4 transition-transform" :class="showOptions ? 'rotate-180' : ''" />
            </button>
          </div>

          <!-- Advanced Options -->
          <div v-show="showOptions" class="space-y-4 pt-4 border-t border-border">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-2">{{ $t('home.form.concurrent') }}</label>
                <div class="flex items-center gap-2">
                  <button 
                    @click="maxConcurrentSegments = Math.max(1, maxConcurrentSegments - 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Minus class="w-4 h-4" />
                  </button>
                  <input
                    v-model.number="maxConcurrentSegments"
                    type="number"
                    min="1"
                    max="32"
                    class="flex-1 text-center bg-background border border-input rounded-lg py-2 text-sm text-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                  <button 
                    @click="maxConcurrentSegments = Math.min(32, maxConcurrentSegments + 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-2">{{ $t('home.form.retries') }}</label>
                <div class="flex items-center gap-2">
                  <button 
                    @click="maxRetries = Math.max(0, maxRetries - 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Minus class="w-4 h-4" />
                  </button>
                  <input
                    v-model.number="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    class="flex-1 text-center bg-background border border-input rounded-lg py-2 text-sm text-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                  <button 
                    @click="maxRetries = Math.min(10, maxRetries + 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-2">{{ $t('home.form.startSegment') }}</label>
                <div class="flex items-center gap-2">
                  <button 
                    @click="startSegmentIndex = Math.max(0, startSegmentIndex - 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Minus class="w-4 h-4" />
                  </button>
                  <input
                    v-model.number="startSegmentIndex"
                    type="number"
                    min="0"
                    class="flex-1 text-center bg-background border border-input rounded-lg py-2 text-sm text-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                  <button 
                    @click="startSegmentIndex = startSegmentIndex + 1"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
                <p class="mt-1.5 text-xs text-muted-foreground">{{ $t('home.form.startSegmentHint') }}</p>
              </div>
            </div>

            <div class="flex items-center justify-between py-3 border-t border-border">
              <div>
                <span class="text-sm text-foreground">{{ $t('home.form.toMp4') }}</span>
                <p class="text-xs text-muted-foreground">{{ $t('home.form.toMp4Desc') }}</p>
              </div>
              <button
                @click="convertToMp4 = !convertToMp4"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-background"
                :class="convertToMp4 ? 'bg-violet-500' : 'bg-muted'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="convertToMp4 ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <div class="flex items-center justify-between py-3 border-t border-border">
              <div>
                <span class="text-sm text-foreground">{{ $t('home.form.downloadCover') }}</span>
                <p class="text-xs text-muted-foreground">
                  {{ coverUrl ? $t('home.form.coverGot') : $t('home.form.coverNotGot') }}
                </p>
              </div>
              <button
                @click="downloadCover = !downloadCover"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-background"
                :class="downloadCover ? 'bg-violet-500' : 'bg-muted'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="downloadCover ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <div v-if="supportsDirectoryPicker" class="flex items-center justify-between py-3 border-t border-border">
              <div>
                <span class="text-sm text-foreground">{{ $t('home.form.streamDownload') }}</span>
                <p class="text-xs text-muted-foreground">{{ $t('home.form.streamDownloadDesc') }}</p>
              </div>
              <button
                @click="streamDownload = !streamDownload"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-background"
                :class="streamDownload ? 'bg-violet-500' : 'bg-muted'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="streamDownload ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>

          <!-- Download & Preview Buttons -->
          <div class="flex gap-3">
            <button
              @click="startDownload"
              :disabled="!canDownload || isDownloading"
              class="flex-1 py-3.5 px-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
            >
              <Loader2 v-if="isDownloading" class="w-5 h-5 animate-spin" />
              <Download v-else class="w-5 h-5" />
              {{ isDownloading ? $t('home.form.startDownloading') : $t('home.form.startDownload') }}
            </button>
            <button
              @click="() => openPreview()"
              :disabled="!canPreview || previewCheckStatus === 'checking'"
              class="py-3.5 px-4 bg-background border border-input text-foreground rounded-xl font-medium hover:bg-muted transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :title="$t('home.form.previewTitle')"
            >
              <Loader2 v-if="previewCheckStatus === 'checking'" class="w-5 h-5 animate-spin" />
              <Play v-else class="w-5 h-5" />
              {{ previewCheckStatus === 'checking' ? $t('home.form.previewChecking') : $t('home.form.preview') }}
            </button>
          </div>

          <!-- 预览预检失败提示条 -->
          <div
            v-if="previewCheckStatus === 'failed'"
            class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
          >
            <div class="flex items-start gap-2.5">
              <ShieldAlert class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div class="text-sm leading-relaxed">
                <p class="font-medium text-amber-500 mb-1">{{ $t('home.previewBlocked.title') }}</p>
                <p class="text-muted-foreground">
                  {{ previewCheckError }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <button
                @click="openPreview(true)"
                class="px-3 py-1.5 bg-muted hover:bg-border text-foreground rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Play class="w-3.5 h-3.5" />
                {{ $t('home.previewBlocked.tryAnyway') }}
              </button>
              <button
                @click="previewCheckStatus = 'idle'"
                class="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {{ $t('home.previewBlocked.dismiss') }}
              </button>
              <a
                href="https://www.tampermonkey.net/"
                target="_blank"
                class="ml-auto text-amber-500 hover:text-amber-600 transition-colors inline-flex items-center gap-1"
              >
                {{ $t('home.previewBlocked.installTm') }}
                <ArrowUpRight class="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Tasks List -->
      <div class="bg-card border border-border rounded-2xl overflow-hidden">
        <div class="p-6 border-b border-border flex items-center justify-between">
          <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
            <List class="w-5 h-5 text-violet-500" />
            {{ $t('home.tasks.title') }}
          </h2>
          <button
            v-if="tasks.length > 0"
            @click="clearCompleted"
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {{ $t('home.tasks.clearCompleted') }}
          </button>
        </div>

        <div class="p-6">
          <div v-if="tasks.length === 0" class="text-center py-12">
            <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Inbox class="w-8 h-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground font-medium mb-1">{{ $t('home.tasks.empty') }}</p>
            <p class="text-muted-foreground/70 text-sm">{{ $t('home.tasks.emptySub') }}</p>
          </div>

          <div v-else class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            <div
              v-for="task in tasks"
              :key="task.id"
              class="bg-background border border-border rounded-xl p-4 hover:border-border/80 transition-colors"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      v-if="task.coverUrl && !task.coverPreviewFailed"
                      :src="task.coverUrl"
                      :alt="$t('home.tasks.coverAlt')"
                      class="w-10 h-10 object-cover cursor-zoom-in"
                      referrerpolicy="no-referrer"
                      @click="previewImage = task.coverUrl || null"
                      @error="task.coverPreviewFailed = true"
                    />
                    <Film v-else class="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p class="font-medium text-foreground text-sm">{{ task.title }}</p>
                    <p class="text-xs text-muted-foreground">{{ formatTime(task.createdAt) }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span 
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="getStatusClass(task.status)"
                  >
                    {{ getStatusText(task.status) }}
                  </span>
                  <button
                    v-if="task.status === 'downloading' || task.status === 'paused'"
                    @click="cancelTask(task)"
                    class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <!-- Progress -->
              <div v-if="task.status === 'downloading' || task.status === 'merging' || task.status === 'parsing'" class="space-y-2">
                <div v-if="task.status === 'parsing'" class="text-xs text-muted-foreground animate-pulse">
                  {{ $t('home.tasks.parsing') }}
                </div>
                <div v-else-if="task.status === 'merging'" class="text-xs text-muted-foreground animate-pulse">
                  {{ $t('home.tasks.merging', { count: task.segments.downloaded }) }}
                </div>
                <template v-else>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted-foreground font-medium">{{ task.progress }}%</span>
                    <span class="text-muted-foreground/70">{{ $t('home.tasks.segments', { downloaded: task.segments.downloaded, total: task.segments.total }) }}</span>
                  </div>
                  <div class="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                      :style="{ width: `${Math.max(1, task.progress)}%` }"
                    />
                  </div>
                </template>
              </div>

              <!-- Error -->
              <div v-if="task.status === 'error'" class="mt-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {{ task.error }}
              </div>

              <!-- Completed -->
              <div v-if="task.status === 'completed' && task.filename" class="mt-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <div class="flex items-center gap-2">
                  <CheckCircle class="w-4 h-4" />
                  <span>{{ $t('home.tasks.completed', { filename: task.filename }) }}</span>
                </div>
                <div class="flex items-center justify-between gap-2 mt-1">
                  <p class="text-xs text-emerald-500/70 break-all" :title="task.dirName">
                    {{ task.savedToDirectory ? $t('home.tasks.savedChosen', { dir: task.dirName || $t('home.tasks.defaultDir') }) : $t('home.tasks.savedDefault') }}
                  </p>
                </div>
              </div>

              <!-- Actions -->
              <div v-if="task.status === 'paused'" class="mt-3 flex gap-2">
                <button
                  @click="resumeTask(task)"
                  class="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {{ $t('home.tasks.resume') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Start Guide -->
    <div class="mt-8 bg-card border border-border rounded-2xl overflow-hidden">
      <div class="p-6 border-b border-border">
        <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
          <Rocket class="w-5 h-5 text-violet-500" />
          {{ $t('home.quickStart.title') }}
        </h2>
        <p class="text-sm text-muted-foreground mt-1">{{ $t('home.quickStart.subtitle') }}</p>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Step 1 -->
          <div class="relative bg-muted/40 border border-border rounded-xl p-4">
            <div class="w-8 h-8 rounded-full bg-violet-500 text-white text-sm font-bold flex items-center justify-center mb-3">1</div>
            <h3 class="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Puzzle class="w-4 h-4 text-violet-500" />
              {{ $t('home.quickStart.step1Title') }}
            </h3>
            <p class="text-xs text-muted-foreground leading-relaxed mb-2.5">{{ $t('home.quickStart.step1Desc') }}</p>
            <a href="https://www.tampermonkey.net/" target="_blank" class="inline-flex items-center gap-1 text-xs text-violet-500 hover:text-violet-600 font-medium">
              {{ $t('home.quickStart.step1Link') }} <ArrowUpRight class="w-3 h-3" />
            </a>
          </div>
          <!-- Step 2 -->
          <div class="relative bg-muted/40 border border-border rounded-xl p-4">
            <div class="w-8 h-8 rounded-full bg-violet-500 text-white text-sm font-bold flex items-center justify-center mb-3">2</div>
            <h3 class="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <FileCode class="w-4 h-4 text-violet-500" />
              {{ $t('home.quickStart.step2Title') }}
            </h3>
            <p class="text-xs text-muted-foreground leading-relaxed mb-2.5">{{ $t('home.quickStart.step2Desc') }}</p>
            <a href="https://update.greasyfork.org/scripts/603547/%E7%A7%8B%E4%BA%91%20M3U8%20%E4%B8%8B%E8%BD%BD%E5%8A%A9%E6%89%8B.user.js" target="_blank" class="inline-flex items-center gap-1 text-xs text-violet-500 hover:text-violet-600 font-medium">
              {{ $t('home.quickStart.step2Link') }} <ArrowUpRight class="w-3 h-3" />
            </a>
          </div>
          <!-- Step 3 -->
          <div class="relative bg-muted/40 border border-border rounded-xl p-4">
            <div class="w-8 h-8 rounded-full bg-violet-500 text-white text-sm font-bold flex items-center justify-center mb-3">3</div>
            <h3 class="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <MonitorPlay class="w-4 h-4 text-violet-500" />
              {{ $t('home.quickStart.step3Title') }}
            </h3>
            <p class="text-xs text-muted-foreground leading-relaxed">{{ $t('home.quickStart.step3Desc') }}</p>
          </div>
          <!-- Step 4 -->
          <div class="relative bg-muted/40 border border-border rounded-xl p-4">
            <div class="w-8 h-8 rounded-full bg-violet-500 text-white text-sm font-bold flex items-center justify-center mb-3">4</div>
            <h3 class="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Download class="w-4 h-4 text-violet-500" />
              {{ $t('home.quickStart.step4Title') }}
            </h3>
            <p class="text-xs text-muted-foreground leading-relaxed">{{ $t('home.quickStart.step4Desc') }}</p>
          </div>
        </div>
        <!-- 手动模式提示 -->
        <div class="mt-4 flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <ClipboardPaste class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p class="text-xs text-muted-foreground leading-relaxed">
            <span class="text-foreground font-medium">{{ $t('home.quickStart.manualTitle') }}</span>{{ $t('home.quickStart.manualDesc') }}
          </p>
        </div>
      </div>
    </div>

    <!-- 封面放大预览 -->
    <Teleport to="body">
      <div
        v-if="previewImage"
        class="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out"
        @click="previewImage = null"
      >
        <img
          :src="previewImage"
          :alt="$t('home.tasks.coverPreviewAlt')"
          class="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl"
          referrerpolicy="no-referrer"
        />
        <button
          class="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          @click.stop="previewImage = null"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
    </Teleport>

    <!-- M3U8 播放器预览模态框 -->
    <Teleport to="body">
      <div
        v-if="playerPreviewUrl"
        class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
        @click.self="closePreview"
      >
        <div class="w-full max-w-5xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
          <div class="flex items-center justify-between px-5 py-3 border-b border-border bg-background/50">
            <div class="flex-1 min-w-0 mr-4">
              <p class="font-medium text-foreground truncate">{{ playerPreviewTitle || $t('home.previewModal.defaultTitle') }}</p>
              <p class="text-xs text-muted-foreground truncate" :title="playerPreviewUrl">{{ playerPreviewUrl }}</p>
            </div>
            <button
              class="w-9 h-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center flex-shrink-0"
              @click="closePreview"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="bg-black">
            <M3U8Player :src="playerPreviewUrl" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  Download,
  Shield,
  Activity,
  Zap,
  Link,
  X,
  Minus,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  List,
  Inbox,
  Film,
  Rocket,
  Puzzle,
  FileCode,
  MonitorPlay,
  ArrowUpRight,
  ClipboardPaste,
  Loader2,
  CheckCircle,
  Play,
  ShieldAlert
} from 'lucide-vue-next';
import type { DownloadTask, DownloadOptions, AppSettings } from '~/types';
import { isDirectoryPickerSupported, pickSaveDirectory } from '~/utils/stream-save';
import { defaultSettings, loadSettings } from '~/composables/useSettings';
import M3U8Player from '~/components/M3U8Player.vue';

// 页面元数据
definePageMeta({
  layout: 'default'
});

const { isTampermonkeyAvailable, createTask, startDownload: startDownloadTask, tasks, cancelTask, resumeTask, currentTask, isDownloading } = useDownloader();
const { fetchM3U8, PREVIEW_PROBE_TIMEOUT } = useTampermonkey();
const { t } = useI18n();
const localePath = useLocalePath();

const SITE_URL = 'https://m3u8.qiuyun.dev';

// 页面级 SEO 元数据（跟随当前语言）
useSeoMeta({
  title: () => t('home.seoTitle'),
  description: () => t('home.seoDescription'),
  ogTitle: () => t('home.seoTitle'),
  ogDescription: () => t('home.seoDescription'),
  ogUrl: () => `${SITE_URL}${localePath('/')}`.replace(/\/$/, ''),
});

const m3u8Url = ref('');
const customFilename = ref('');
const nameError = ref(false);
const previewImage = ref<string | null>(null);
const maxConcurrentSegments = ref(15);
const maxRetries = ref(3);
const startSegmentIndex = ref(0);
const convertToMp4 = ref(false);
const downloadCover = ref(true);
const streamDownload = ref(true);
const supportsDirectoryPicker = ref(false);
const coverUrl = ref('');
const showOptions = ref(false);
const appSettings = ref<AppSettings>({ ...defaultSettings });

// 预览播放器状态
const playerPreviewUrl = ref('');
const playerPreviewTitle = ref('');
const previewCheckStatus = ref<'idle' | 'checking' | 'failed'>('idle');
const previewCheckError = ref('');

const canPreview = computed(() => m3u8Url.value.trim().length > 0);

/**
 * 预检 m3u8 是否可从浏览器 fetch 到（跨域探测）
 *  - 成功 → 弹窗播放
 *  - 失败 → 不弹窗，在表单下方显示提示条
 *  - force=true → 跳过预检直接弹窗
 */
async function openPreview(force = false) {
  if (!canPreview.value) return;
  const url = m3u8Url.value.trim();
  const title = customFilename.value.trim() || t('home.previewModal.defaultTitle');

  if (force) {
    playerPreviewUrl.value = url;
    playerPreviewTitle.value = title;
    document.body.style.overflow = 'hidden';
    previewCheckStatus.value = 'idle';
    return;
  }

  previewCheckStatus.value = 'checking';
  previewCheckError.value = '';

  try {
    // 预检用短超时：跨域/挂起场景快速失败，避免用户干等
    await fetchM3U8(url, PREVIEW_PROBE_TIMEOUT);
    playerPreviewUrl.value = url;
    playerPreviewTitle.value = title;
    document.body.style.overflow = 'hidden';
    previewCheckStatus.value = 'idle';
  } catch (err) {
    const msg = err instanceof Error ? err.message : t('common.unknownError');
    previewCheckError.value = t('home.previewBlocked.corsError', { msg });
    previewCheckStatus.value = 'failed';
  }
}

function closePreview() {
  playerPreviewUrl.value = '';
  playerPreviewTitle.value = '';
  document.body.style.overflow = '';
}

/** 下载完成/失败后发送系统通知（需在设置中开启） */
async function notifyTask(task: DownloadTask) {
  if (!appSettings.value.enableNotification) return;
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission !== 'granted') return;
  const ok = task.status === 'completed';
  const dir = task.dirName ? ` ${t('home.notification.savedTo', { dir: task.dirName })}` : '';
  new Notification(ok ? t('home.notification.done') : t('home.notification.failed'), {
    body: ok
      ? `${task.filename || task.title}${dir}`
      : t('home.notification.failedBody', { title: task.title, error: task.error || t('common.unknownError') }),
    tag: task.id,
  });
}

const canDownload = computed(() => m3u8Url.value.trim().length > 0);

async function startDownload() {
  if (!canDownload.value) return;

  // 文件名称必填
  if (!customFilename.value.trim()) {
    nameError.value = true;
    return;
  }

  const filename = customFilename.value.trim();

  // 流式下载：在用户点击后立即弹出目录选择（需保留用户手势）
  let directoryHandle: FileSystemDirectoryHandle | undefined;
  if (streamDownload.value && supportsDirectoryPicker.value) {
    directoryHandle = (await pickSaveDirectory()) || undefined;
    // 用户取消了目录选择：直接放弃本次下载，不静默回退为浏览器下载
    if (!directoryHandle) return;
  }

  const options: DownloadOptions = {
    url: m3u8Url.value.trim(),
    filename,
    maxConcurrentSegments: maxConcurrentSegments.value,
    maxRetries: maxRetries.value,
    startSegmentIndex: startSegmentIndex.value,
    convertToMp4: convertToMp4.value,
    outputPath: '',
    coverUrl: coverUrl.value || undefined,
    downloadCover: downloadCover.value,
    directoryHandle,
  };

  const task = await createTask(options);
  await startDownloadTask(task, options);
  await notifyTask(task);

  // 下载完成后清空「新建下载」表单，避免带着上一条链接重复提交
  if (task.status === 'completed') {
    m3u8Url.value = '';
    customFilename.value = '';
    coverUrl.value = '';
    startSegmentIndex.value = 0;
  }
}

function clearCompleted() {
  const completedIds = tasks.value
    .filter(t => t.status === 'completed')
    .map(t => t.id);
  tasks.value = tasks.value.filter(t => !completedIds.includes(t.id));
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusClass(status: DownloadTask['status']) {
  const classes: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    parsing: 'bg-blue-500/10 text-blue-500',
    downloading: 'bg-violet-500/10 text-violet-500',
    paused: 'bg-amber-500/10 text-amber-500',
    merging: 'bg-fuchsia-500/10 text-fuchsia-500',
    completed: 'bg-emerald-500/10 text-emerald-500',
    error: 'bg-destructive/10 text-destructive',
  };
  return classes[status] || 'bg-muted text-muted-foreground';
}

function getStatusText(status: DownloadTask['status']) {
  const texts: Record<string, string> = {
    pending: t('home.tasks.status.pending'),
    parsing: t('home.tasks.status.parsing'),
    downloading: t('home.tasks.status.downloading'),
    paused: t('home.tasks.status.paused'),
    merging: t('home.tasks.status.merging'),
    completed: t('home.tasks.status.completed'),
    error: t('home.tasks.status.error'),
  };
  return texts[status] || status;
}

onMounted(() => {
  supportsDirectoryPicker.value = isDirectoryPickerSupported();

  // 应用设置页保存的默认值（并发数 / 重试次数 / 通知）
  appSettings.value = loadSettings();
  maxConcurrentSegments.value = appSettings.value.defaultMaxConcurrentSegments;
  maxRetries.value = appSettings.value.defaultMaxRetries;

  const route = useRoute();
  // 注意：Vue Router 已经对 query 解码过一次，这里不能再 decodeURIComponent，
  // 否则签名参数里的 %2F 等会被二次解码破坏，导致封面/M3U8 地址失效。
  const urlParam = route.query.url as string;
  const titleParam = route.query.title as string;
  const coverParam = route.query.cover as string;

  // 暴露全局函数供油猴脚本调用（视频页面点击下载按钮时会调用）
  if (typeof window !== 'undefined') {
    (window as Window & { autoFillM3U8?: (url: string, title: string | null) => void }).autoFillM3U8 = (url: string, title: string | null) => {
      m3u8Url.value = url;
      if (title) customFilename.value = title;
      console.log('[M3U8] autoFillM3U8 被调用:', url, title);
    };
  }

  // 从 URL 参数获取 M3U8 链接
  if (urlParam) {
    m3u8Url.value = urlParam;
    console.log('[M3U8] 从 URL 参数获取到 M3U8:', urlParam);
  }
  // 从 URL 参数获取标题
  if (titleParam && !customFilename.value) {
    customFilename.value = titleParam;
  }
  // 从 URL 参数获取封面
  if (coverParam) {
    coverUrl.value = coverParam;
    console.log('[M3U8] 从 URL 参数获取到封面:', coverUrl.value);
  }
});
</script>
