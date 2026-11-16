import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

// 在 React 首帧之前移除 Widget 根节点背景，避免透明窗口先绘制矩形底色。
const isInitialWidgetRoute = window.location.hash.startsWith('#/widget');
document.documentElement.classList.toggle('widget-route', isInitialWidgetRoute);
document.body.classList.toggle('widget-route', isInitialWidgetRoute);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#66643F',
            colorInfo: '#66643F',
            colorSuccess: '#5C6250',
            colorWarning: '#6A5F2F',
            colorError: '#6B4D43',
            colorText: '#292622',
            colorTextSecondary: '#514C46',
            colorTextTertiary: '#6A6259',
            colorBgBase: '#F4F1EB',
            colorBgLayout: '#F4F1EB',
            colorBgContainer: '#FCFBF8',
            colorBgElevated: '#FFFFFF',
            colorBorder: '#D8D0C4',
            colorBorderSecondary: '#E4DED5',
            colorFillSecondary: '#EEEAE3',
            colorFillTertiary: '#F3F0EA',
            colorFillQuaternary: '#F7F4EE',
            borderRadius: 6,
            borderRadiusLG: 10,
            controlHeight: 34,
            controlHeightLG: 40,
            controlHeightSM: 28,
            fontSize: 14,
            fontSizeSM: 13,
            fontSizeLG: 16,
            fontWeightStrong: 600,
            fontFamily:
              '"Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI", "PingFang SC", sans-serif',
            boxShadow: '0 12px 32px rgba(53, 49, 41, 0.12)',
            boxShadowSecondary: '0 18px 48px rgba(53, 49, 41, 0.16)',
            motionDurationFast: '0.12s',
            motionDurationMid: '0.16s',
            motionDurationSlow: '0.2s',
          },
          components: {
            Layout: {
              bodyBg: '#F4F1EB',
              siderBg: '#EAE4DA',
            },
            Menu: {
              itemBg: 'transparent',
              itemColor: '#514C46',
              itemHoverBg: '#E1DED0',
              itemHoverColor: '#292622',
              itemSelectedBg: '#D9D7C0',
              itemSelectedColor: '#4F4E31',
              itemBorderRadius: 8,
              itemHeight: 40,
              iconSize: 17,
            },
            Button: {
              defaultBg: '#FCFBF8',
              defaultBorderColor: '#D8D0C4',
              defaultColor: '#292622',
              primaryShadow: 'none',
              defaultShadow: 'none',
              dangerShadow: 'none',
            },
            Card: {
              headerBg: 'transparent',
            },
            Input: {
              activeBorderColor: '#79764E',
              hoverBorderColor: '#A5A07B',
              activeShadow: '0 0 0 2px rgba(102, 100, 63, 0.14)',
            },
            InputNumber: {
              activeBorderColor: '#79764E',
              hoverBorderColor: '#A5A07B',
              activeShadow: '0 0 0 2px rgba(102, 100, 63, 0.14)',
            },
            Select: {
              optionActiveBg: '#ECEADB',
              optionSelectedBg: '#DDDBC5',
              optionSelectedColor: '#292622',
              activeBorderColor: '#79764E',
              hoverBorderColor: '#A5A07B',
              activeOutlineColor: 'rgba(102, 100, 63, 0.14)',
            },
            Dropdown: {
              controlItemBgHover: '#ECEADB',
              controlItemBgActive: '#DDDBC5',
            },
            Tooltip: {
              colorBgSpotlight: '#36332E',
              colorTextLightSolid: '#FCFBF8',
            },
            Progress: {
              defaultColor: '#66643F',
              remainingColor: '#E4DED5',
            },
            Pagination: {
              itemActiveBg: '#E4E2D0',
            },
            Checkbox: {
              colorPrimary: '#66643F',
              colorPrimaryHover: '#79764E',
            },
            Descriptions: {
              labelBg: '#F1EEE8',
              titleColor: '#292622',
            },
            Modal: {
              contentBg: '#FFFFFF',
              headerBg: '#FFFFFF',
              footerBg: '#FFFFFF',
              titleColor: '#292622',
            },
          },
        }}
      >
        <App />
      </ConfigProvider>
    </HashRouter>
  </React.StrictMode>
);
