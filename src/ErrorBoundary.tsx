import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Do not log medicine records or account details. */ }
  render() {
    return this.state.failed ? <main id="main-content" className="runtime-error" tabIndex={-1}><h1>We couldn’t open this workspace.</h1><p>Your saved local records have not been cleared. Reload to try again.</p><div className="actions"><button className="btn primary" onClick={() => location.reload()}>Reload MediRead</button><a className="btn secondary" href="/">Return home</a></div></main> : this.props.children;
  }
}
