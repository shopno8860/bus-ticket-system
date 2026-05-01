import { Helmet } from 'react-helmet-async';

function PageTitle({ title = '' }) {
  const fullTitle = title ? `EasyTrip | ${title}` : 'EasyTrip';

  return (
    <Helmet>
      <title>{fullTitle}</title>
    </Helmet>
  );
}

export default PageTitle;
