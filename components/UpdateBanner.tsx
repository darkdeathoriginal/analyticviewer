/**
 * Re-export from react-native-github-ota with app-specific theme colors.
 */
import React from "react";
import {
  OtaUpdateBanner,
  type OtaUpdateBannerProps,
} from "react-native-github-ota";
import { Colors } from "../constants/theme";

type UpdateBannerProps = Omit<OtaUpdateBannerProps, "colors">;

export default function UpdateBanner(props: UpdateBannerProps) {
  return (
    <OtaUpdateBanner
      {...props}
      colors={{
        surface: Colors.surface,
        text: Colors.text,
        textSecondary: Colors.textSecondary,
        primary: Colors.primary,
        danger: Colors.danger,
        border: Colors.surfaceLight,
      }}
    />
  );
}
