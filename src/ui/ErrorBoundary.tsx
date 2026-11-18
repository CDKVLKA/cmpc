import { Component, type ReactNode } from "react";

interface Props {
  resetKey: string;
  title: string;
  retry: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** One broken view stays on its own screen instead of blanking the app. */
export class ViewBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <h1>{this.props.title}</h1>
        <p>{this.state.error.message}</p>
        <button type="button" className="primary" onClick={() => this.setState({ error: null })}>{this.props.retry}</button>
      </div>
    );
  }
}
