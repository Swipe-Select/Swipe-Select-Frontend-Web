import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ResumeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Resume Paper Error caught by boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: 28,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 14,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            margin: "12px 0",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dc2626",
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 4px", color: "#991b1b", fontSize: 15, fontWeight: 700 }}>
              Live Resume Preview Notice
            </h4>
            <p style={{ margin: 0, color: "#7f1d1d", fontSize: 13, maxWidth: 440 }}>
              The interactive template encountered a formatting glitch. Your generated text is safe and directly accessible in the Raw Text tab.
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, errorMessage: "" })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              background: "#ffffff",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: "#991b1b",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={13} />
            <span>Retry Preview</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
