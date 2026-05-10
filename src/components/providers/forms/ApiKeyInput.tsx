import React, { useState, useCallback } from "react";
import { Eye, EyeOff, ClipboardPaste } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  id?: string;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  label = "API Key",
  id = "apiKey",
}) => {
  const { t } = useTranslation();
  const [showKey, setShowKey] = useState(false);

  const toggleShowKey = () => {
    setShowKey(!showKey);
  };

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        onChange(text.trim());
        toast.success(t("apiKeyInput.pasteFromClipboard"));
      }
    } catch {
      toast.error("无法读取剪贴板");
    }
  }, [onChange, t]);

  const inputClass = `w-full px-3 py-2 pr-20 border rounded-lg text-sm transition-colors ${
    disabled
      ? "bg-muted border-border-default text-muted-foreground cursor-not-allowed"
      : "border-border-default bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
  }`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label} {required && "*"}
      </label>
      <div className="relative">
        <input
          type={showKey ? "text" : "password"}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t("apiKeyInput.placeholder")}
          disabled={disabled}
          required={required}
          autoComplete="off"
          className={inputClass}
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {!disabled && (
            <button
              type="button"
              onClick={pasteFromClipboard}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("apiKeyInput.pasteFromClipboard")}
              title={t("apiKeyInput.pasteFromClipboard")}
            >
              <ClipboardPaste size={14} />
            </button>
          )}
          {!disabled && value && (
            <button
              type="button"
              onClick={toggleShowKey}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showKey ? t("apiKeyInput.hide") : t("apiKeyInput.show")}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInput;
