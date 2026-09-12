import * as path from 'path';
import * as fs from 'fs';
import { CrossPlatformKeyMonitor } from './cross-platform-key-monitor';

export class FnKeyMonitor {
  private nativeModule: any = null;
  private onKeyDown: (() => void) | null = null;
  private onKeyUp: (() => void) | null = null;
  private isActive = false;

  constructor(onKeyDown: () => void, onKeyUp: () => void) {
    this.onKeyDown = onKeyDown;
    this.onKeyUp = onKeyUp;
  }

  start(): boolean {
    if (this.isActive) {
      try { console.log('Fn key monitor already running'); } catch (e) { /* ignore */ }
      return false;
    }

    if (process.platform !== 'darwin') {
      try {
        this.nativeModule = new CrossPlatformKeyMonitor();
        const success = this.nativeModule.startMonitoring('fn', (event: string) => {
          if (event === 'FN_KEY_DOWN') this.onKeyDown?.();
          else if (event === 'FN_KEY_UP') this.onKeyUp?.();
        });
        this.isActive = success;
        return success;
      } catch (error) {
        console.error('[FnKeyMonitor] Cross-platform monitor failed to start:', error);
        return false;
      }
    }

    try {
      // Load the native module
      const fnKeyMonitorPath = this.findNativeModule();
      if (!fnKeyMonitorPath) {
        console.error('Fn key monitor native module not found');
        return false;
      }

      console.log('Loading Fn key monitor native module from:', fnKeyMonitorPath);
      
      // Use eval('require') to bypass webpack's require interception
      const nodeRequire = eval('require');
      try {
        this.nativeModule = nodeRequire(fnKeyMonitorPath);
        console.log('✅ [FnKeyMonitor] Native module loaded successfully');
      } catch (loadError) {
        console.error('❌ [FnKeyMonitor] Failed to load native module:', loadError);
        return false;
      }
      
      if (!this.nativeModule || !this.nativeModule.startMonitoring) {
        console.error('Invalid native module - missing startMonitoring method');
        return false;
      }

      // Check accessibility permissions first
      if (this.nativeModule.checkAccessibilityPermissions) {
        const hasPermissions = this.nativeModule.checkAccessibilityPermissions();
        if (!hasPermissions) {
          console.error('❌ Accessibility permission required! Please add this app to Accessibility in System Preferences > Privacy & Security');
          return false;
        }
      }

      // Start monitoring with callback
      const success = this.nativeModule.startMonitoring((event: string) => {
        console.log('🎯 [FnKeyMonitor] Native event received:', event);
        
        if (event === 'FN_KEY_DOWN') {
          this.onKeyDown?.();
        } else if (event === 'FN_KEY_UP') {
          this.onKeyUp?.();
        }
      });

      if (success) {
        this.isActive = true;
        console.log('✅ Fn key push-to-talk monitoring started');
        console.log('📖 Usage: Hold Fn key to record, release to transcribe and auto-paste');
        return true;
      } else {
        console.error('❌ Failed to start Fn key monitoring');
        return false;
      }
    } catch (error) {
      console.error('Failed to start Fn key monitor:', error);
      return false;
    }
  }

  private findNativeModule(): string | null {
    // Check multiple possible paths for the native module
    const possiblePaths = [
      // Production build - dist folder
      path.join(__dirname, 'fn_key_monitor.node'),
      path.join(__dirname, '../fn_key_monitor.node'),
      
      // Development - build folder
      path.join(__dirname, '../../build/Release/fn_key_monitor.node'),
      
      // From app root
      path.join(process.cwd(), 'dist/fn_key_monitor.node'),
      path.join(process.cwd(), 'build/Release/fn_key_monitor.node'),
      
      // Resources path (for packaged app)
      path.join(process.resourcesPath, 'fn_key_monitor.node'),
      path.join(process.resourcesPath, 'app.asar.unpacked/dist/fn_key_monitor.node'),
    ];

    console.log('🔍 [FnKeyMonitor] Searching for native module...');
    console.log('🔍 [FnKeyMonitor] __dirname:', __dirname);
    console.log('🔍 [FnKeyMonitor] process.cwd():', process.cwd());
    console.log('🔍 [FnKeyMonitor] process.resourcesPath:', process.resourcesPath);

    for (const modulePath of possiblePaths) {
      console.log(`🔍 [FnKeyMonitor] Checking path: ${modulePath}`);
      if (fs.existsSync(modulePath)) {
        console.log(`✅ [FnKeyMonitor] Found native module at: ${modulePath}`);
        return modulePath;
      }
    }

    console.error('❌ [FnKeyMonitor] Native module not found in any of the searched paths');
    return null;
  }

  stop(): void {
    if (!this.isActive || !this.nativeModule) {
      return;
    }

    try {
      if (this.nativeModule.stopMonitoring) {
        this.nativeModule.stopMonitoring();
      }
      this.isActive = false;
      this.nativeModule = null;
      console.log('Fn key monitoring stopped');
    } catch (error) {
      console.error('Error stopping Fn key monitor:', error);
    }
  }
}
