import { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import HomePage from '../components/main/HomePage';
import SettingsPage from '../components/main/SettingsPage';
import ArticleLibraryPage from '../components/main/ArticleLibraryPage';
import ReviewPage from '../components/main/ReviewPage';
import ResearchDirectionsPage from '../components/main/ResearchDirectionsPage';

const { Sider, Content } = Layout;

type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
};

const menuItems: MenuItem[] = [
  { key: 'home', icon: <HomeOutlined />, label: '首页' },
  { key: 'research', icon: <ExperimentOutlined />, label: '研究方向' },
  { key: 'library', icon: <DatabaseOutlined />, label: '文章库' },
  { key: 'review', icon: <ClockCircleOutlined />, label: '复习计划' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
];

export default function MainView() {
  const [selectedKey, setSelectedKey] = useState('home');

  const renderContent = () => {
    switch (selectedKey) {
      case 'home':
        return <HomePage />;
      case 'research':
        return <ResearchDirectionsPage />;
      case 'library':
        return <ArticleLibraryPage />;
      case 'review':
        return <ReviewPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <Layout className="app-shell">
      <Sider width={200} theme="light" className="app-sidebar">
        <div className="app-brand">
          <span className="app-brand__mark" aria-hidden="true">
            <ReadOutlined />
          </span>
          <h1 className="app-brand__name">PaperDaily</h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={(e) => setSelectedKey(e.key)}
          className="app-menu"
        />
      </Sider>
      <Layout>
        <Content className="app-content">{renderContent()}</Content>
      </Layout>
    </Layout>
  );
}
