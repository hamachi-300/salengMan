import { useNavigate } from 'react-router-dom';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  backTo: string;
  rightElement?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, backTo, rightElement }) => {
  const navigate = useNavigate();

  return (
    <div className={styles['header']}>
      <button className={styles['back-button']} onClick={() => navigate(backTo)}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
      </button>
      <h1 className={styles['title']}>{title}</h1>
      {rightElement && <div className={styles['right-element']}>{rightElement}</div>}
    </div>
  );
};

export default PageHeader;
