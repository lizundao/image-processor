/**
 * 判断是否运行在 Tauri 桌面环境。
 *
 * Tauri 2 在 withGlobalTauri=false（本项目配置）时不再注入 window.__TAURI__，
 * 但 IPC 必需的 window.__TAURI_INTERNALS__ 始终存在。
 * 此处同时兼容 withGlobalTauri=true 的情况，避免日后切换配置导致功能失效。
 */
export function isTauriEnv(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}
