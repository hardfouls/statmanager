-- 1. National parent body (insert first so provincial rows can reference it)
INSERT INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('School Sport Canada',
     'School Sport Canada',
     'SSC',
     'national',
     NULL,
     'Canada',
     'https://www.schoolsport.ca/',
     NULL,
     NULL,
     NULL);

-- Capture the generated national org_id for reuse
SET @ssc_id = LAST_INSERT_ID();

-- 2. School Sport New Brunswick
INSERT INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('School Sport New Brunswick',
     'School Sport NB',
     'NBIAA',
     'provincial',
     @ssc_id,
     'New Brunswick, Canada',
     'https://www.ss-nb.org/en/',
     NULL,
     'https://www.ss-nb.org/Content/images/ssnb-logo.svg',
     NULL);

-- 3. School Sport Nova Scotia
INSERT INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('School Sport Nova Scotia',
     'School Sport NS',
     'NSSAF',
     'provincial',
     @ssc_id,
     'Nova Scotia, Canada',
     'https://sites.google.com/gnspes.ca/nssaf/home',
     NULL,
     NULL,
     NULL);

-- 4. Prince Edward Island School Athletic Association
INSERT INTO organizations
    (name, short_name, acronym, level, parent_org_id, jurisdiction, website, contact_email, logo_url, founded_date)
VALUES
    ('Prince Edward Island School Athletic Association',
     'PEI School Athletic Assoc.',
     'PEISAA',
     'provincial',
     @ssc_id,
     'Prince Edward Island, Canada',
     'http://peisaa.pe.ca/',
     NULL,
     NULL,
     NULL);