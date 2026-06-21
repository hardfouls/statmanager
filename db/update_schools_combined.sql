-- =====================================================================
-- update_schools_combined.sql
-- Enrichment UPDATEs for member_org rows (type = 'school')
-- Populates: address, website, founded_date, and (where needed)
--            sanctioning_org_id, plus two new governing-org rows.
--
-- Combines the prior update_schools.sql + update_schools_part2.sql
-- into one ordered script. Run top-to-bottom in a single session
-- (session variables @rseq_id / @ofsaa_id must persist).
--
-- SOURCES: official school / district / municipal sites, Wikipedia,
-- and government directories (researched 2026).
--
-- ORDER OF OPERATIONS --------------------------------------------------
--   PART 0 : new governing-org rows (RSEQ, OFSAA) - created FIRST so
--            later school rows can reference @rseq_id / @ofsaa_id.
--   PART A : Address INSERTs + address_id links (all provinces).
--   PART B : website + founded_date (+ org links for the QC/ON/NB-Fr rows).
--   PART C : name correction for #1.
--
-- ADDRESS HANDLING -----------------------------------------------------
-- member_org references addresses via address_id (FK -> Address).
-- PART A assumes an Address table:
--   Address(address_id PK AUTO_INCREMENT, street, city, province,
--           postal_code, country, latitude, longitude)
-- Adjust column names if your Address table differs.
-- PART B (website/founded_date) is schema-independent.
--
-- CONVENTIONS ----------------------------------------------------------
--  * founded_date uses YYYY-01-01 when only a year is known.
--  * Team-nickname rows (e.g. "Auburn Eagles") and spelling-variant
--    duplicates (e.g. "Harrison Tremble") are filled to match their
--    parent school. You chose to enrich as-is; merge later.
--
-- KEY DATA-QUALITY FLAGS -----------------------------------------------
--   - #46 "Prince Andrew High School" was RENAMED "Woodlawn High School"
--     (June 2022). Address/site correct; consider updating the name.
--   - #1  "Alma Academy" is actually the Jeannois basketball TEAM of
--     College d'Alma (CEGEP). Renamed to the institution in PART C.
--   - #1 College d'Alma and #9/#33 Jean-de-Brebeuf are CEGEP/college-
--     level institutions, NOT high schools. Included per your request.
--   - #9 and #33 are duplicates of each other (same school).
--   - #61 TBD: intentional placeholder, left untouched.
-- =====================================================================


-- #####################################################################
-- PART 0 : RESOLVE ORG IDs  (inserted by importDakstatsHistory.sql)
-- #####################################################################
SET @rseq_id  = (SELECT org_id FROM organizations WHERE acronym = 'RSEQ');
SET @ofsaa_id = (SELECT org_id FROM organizations WHERE acronym = 'OFSAA');


-- #####################################################################
-- PART A : ADDRESS INSERTS + LINKS
-- #####################################################################

-- ---------- NOVA SCOTIA (sanctioning_org_id = 5) ----------

-- #2 Amherst Regional High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('190 Willow Street','Amherst','NS','B4H 3W5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 2;

-- #3 Armbrae Academy (Ospreys) - Halifax (independent school)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('1559 Tower Road','Halifax','NS','B3H 3P1','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 3;

-- #4 Auburn Drive High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('300 Auburn Drive','Cole Harbour','NS','B2W 6E9','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 4;

-- #5 Auburn Eagles  (= Auburn Drive High School)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('300 Auburn Drive','Cole Harbour','NS','B2W 6E9','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 5;

-- #6 Bayview High School (Eastern Passage)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('303 Hines Road','Eastern Passage','NS','B3G 1J6','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 6;

-- #11 Charles P. Allen High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('200 Innovation Drive','Bedford','NS','B4B 0G4','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 11;

-- #13 Citadel High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('1855 Trollope Street','Halifax','NS','B3H 0A4','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 13;

-- #14 Cobequid Educational Centre
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('34 Lorne Street','Truro','NS','B2N 3K3','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 14;

-- #15 Cole Harbour High School (Cole Harbour District High School)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('2 Chameau Crescent','Dartmouth','NS','B2W 6V1','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 15;

-- #18 CP Allen Cheetahs  (= Charles P. Allen High School)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('200 Innovation Drive','Bedford','NS','B4B 0G4','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 18;

-- #19 Dartmouth High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('95 Victoria Road','Dartmouth','NS','B3A 1V2','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 19;

-- #23 Halifax Grammar School (independent)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('945 Tower Road','Halifax','NS','B3H 2Y2','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 23;

-- #24 Halifax West High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('283 Thomas Raddall Drive','Halifax','NS','B3S 0E2','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 24;

-- #30 Horton Griffins  (= Horton High School)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('75 Greenwich Road South','Wolfville','NS','B4P 2R2','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 30;

-- #31 Horton High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('75 Greenwich Road South','Wolfville','NS','B4P 2R2','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 31;

-- #38 Lockview High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('148 Lockview Road','Fall River','NS','B2T 1J1','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 38;

-- #40 Millwood Knights  (= Millwood High School)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('141 Millwood Drive','Lower Sackville','NS','B4E 1S5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 40;

-- #43 North Nova Educational Centre (New Glasgow)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('900 Marsh Street','New Glasgow','NS','B2H 4P6','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 43;

-- #45 Park View Education Centre (Bridgewater)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('1485 King Street','Bridgewater','NS','B4V 1B2','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 45;

-- #46 Prince Andrew High School -> RENAMED Woodlawn High School (2022)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('31 Woodlawn Road','Dartmouth','NS','B2W 2R8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 46;

-- #50 Sackville High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('1 Kingfisher Way','Lower Sackville','NS','B4E 0A8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 50;

-- #54 Sir John A Macdonald High School (Tantallon)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('14 Schoolhouse Lane','Upper Tantallon','NS','B3Z 1B7','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 54;

-- #55 Sir John A. MacDonald High School  (= #54, spelling variant)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('14 Schoolhouse Lane','Upper Tantallon','NS','B3Z 1B7','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 55;

-- #65 Yarmouth Consolidated Memorial High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('146 Forest Street','Yarmouth','NS','B5A 3K8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 65;


-- ---------- NEW BRUNSWICK (sanctioning_org_id = 4) ----------

-- #7 Bernice McNaughton (Bernice MacNaughton High School), Moncton
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('999 St. George Boulevard','Moncton','NB','E1E 2C9','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 7;

-- #10 Carleton North High School (Florenceville-Bristol)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('717 Main Street','Florenceville-Bristol','NB','E7L 3G6','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 10;

-- #21 Fredericton High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('300 Priestman Street','Fredericton','NB','E3B 6J8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 21;

-- #25 Harbour View High School (Saint John)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('305 Douglas Avenue','Saint John','NB','E2K 1E5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 25;

-- #26 Harrison Tremble (Harrison Trimble High School), Moncton - spelling variant
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('80 Echo Drive','Moncton','NB','E1A 3M5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 26;

-- #27 Harrison Trimble (Harrison Trimble High School), Moncton
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('80 Echo Drive','Moncton','NB','E1A 3M5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 27;

-- #28 Harrison Trimble High School, Moncton
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('80 Echo Drive','Moncton','NB','E1A 3M5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 28;

-- #29 Harvey High School (Harvey Station)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('14 School Lane','Harvey','NB','E6K 1J7','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 29;

-- #32 James M. Hill (James M. Hill Memorial High School), Miramichi
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('230 Jane Street','Miramichi','NB','E1V 3M6','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 32;

-- #34 Kennebecasis Valley Blue Knights  (= KV High School)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('398 Hampton Road','Quispamsis','NB','E2E 5X5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 34;

-- #35 Kennebecasis Valley Crusaders  (= KV High School, old mascot)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('398 Hampton Road','Quispamsis','NB','E2E 5X5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 35;

-- #36 Kennebecasis Valley High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('398 Hampton Road','Quispamsis','NB','E2E 5X5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 36;

-- #37 Leo Hayes High School (Fredericton)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('499 Cliffe Street','Fredericton','NB','E3A 0A5','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 37;

-- #41 Miramichi Valley High School (Miramichi)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('80 Holiday Drive','Miramichi','NB','E1V 4H8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 41;

-- #42 Moncton High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('207 Millennium Boulevard','Moncton','NB','E1E 0K6','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 42;

-- #44 Oromocto High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('25 MacKenzie Avenue','Oromocto','NB','E2V 1A1','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 44;

-- #47 Riverview High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('400 Whitepine Road','Riverview','NB','E1B 4H8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 47;

-- #48 Rothesay High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('11 Wells Street','Rothesay','NB','E2E 5N9','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 48;

-- #49 Rothesay Netherwood School (independent)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('40 College Hill Road','Rothesay','NB','E2E 5H1','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 49;

-- #51 Saint John High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('170 Prince William Street','Saint John','NB','E2L 2B7','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 51;

-- #53 Simonds High School (Saint John)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('1490 Hickey Road','Saint John','NB','E2J 4E7','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 53;

-- #57 St. Malachy's Memorial High School (Saint John)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('20 Leinster Street','Saint John','NB','E2L 1H8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 57;

-- #58 St. Stephen High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('7 Bay Street','St. Stephen','NB','E3L 1J7','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 58;

-- #59 Sugarloaf Senior High School (Campbellton)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('374 Sugarloaf Street','Campbellton','NB','E3N 3J6','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 59;

-- #60 Sussex Regional High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('500 Leonard Drive','Sussex','NB','E4E 2P8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 60;

-- #63 Woodstock High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('110 Gibson Street','Woodstock','NB','E7M 2R6','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 63;

-- #64 Woodstock Thunder  (= Woodstock High School)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('110 Gibson Street','Woodstock','NB','E7M 2R6','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 64;


-- ---------- PRINCE EDWARD ISLAND (sanctioning_org_id = 6) ----------

-- #8 Bluefield High School (Hampshire / North Wiltshire)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('924 Colville Road','North Wiltshire','PE','C0A 1Y0','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 8;

-- #12 Charlottetown Rural High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('100 Raiders Road','Charlottetown','PE','C1E 1K6','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 12;

-- #16 Colonel Gray #2 High School  (= Colonel Gray Senior High School)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('175 Spring Park Road','Charlottetown','PE','C1A 3Y8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 16;

-- #17 Colonel Gray High School
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('175 Spring Park Road','Charlottetown','PE','C1A 3Y8','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 17;

-- #62 Three Oaks Senior High School (Summerside)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('10 Kenmoore Avenue','Summerside','PE','C1N 4V9','Canada');
UPDATE members SET address_id = LAST_INSERT_ID() WHERE member_id = 62;


-- ---------- QUEBEC / ONTARIO / NB-FRANCOPHONE ----------
-- (These rows bundle address+website+founded+org together because they
--  also set sanctioning_org_id to RSEQ / OFSAA / SSNB.)

-- ---------- NB Francophone (SSNB / NBIAA, org 4) ----------

-- #20 Ecole Sainte-Anne (Fredericton)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('715 Priestman Street','Fredericton','NB','E3B 5W7','Canada');
UPDATE members
  SET address_id = LAST_INSERT_ID(),
      website = 'https://esa.nbed.nb.ca/',
      founded_date = '1974-01-01',   -- school as configured at Centre communautaire ~1974; French primary roots 1965
      sanctioning_org_id = 4
  WHERE member_id = 20;

-- #39 Ecole Mathieu-Martin (Dieppe)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('511 rue Champlain','Dieppe','NB','E1A 1P2','Canada');
UPDATE members
  SET address_id = LAST_INSERT_ID(),
      website = 'https://mathieu-martin.nbed.nb.ca/',
      founded_date = '1972-01-01',
      sanctioning_org_id = 4
  WHERE member_id = 39;


-- ---------- Quebec (RSEQ) ----------

-- #56 Seminaire Saint-Francois (Saint-Augustin-de-Desmaures)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('4900 rue Saint-Felix','Saint-Augustin-de-Desmaures','QC','G3A 0L4','Canada');
UPDATE members
  SET address_id = LAST_INSERT_ID(),
      website = 'https://www.ss-f.com/',
      founded_date = '1952-01-01',   -- relocated/renamed to this site 1952
      sanctioning_org_id = @rseq_id
  WHERE member_id = 56;

-- #1 College d'Alma  (NOTE: CEGEP / post-secondary, not a high school)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('675 boulevard Auger Ouest','Alma','QC','G8B 2B7','Canada');
UPDATE members
  SET address_id = LAST_INSERT_ID(),
      website = 'https://www.collegealma.ca/',
      founded_date = '1972-01-01',   -- College d'Alma created 1972 (CEGEP)
      sanctioning_org_id = @rseq_id
  WHERE member_id = 1;

-- #9 Jean-de-Brebeuf College (NOTE: CEGEP + private secondary; Montreal)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('3200 chemin de la Cote-Sainte-Catherine','Montreal','QC','H3T 1C1','Canada');
UPDATE members
  SET address_id = LAST_INSERT_ID(),
      website = 'https://www.brebeuf.qc.ca/',
      founded_date = '1928-01-01',
      sanctioning_org_id = @rseq_id
  WHERE member_id = 9;

-- #33 Jean-de-Brebeuf College  (DUPLICATE of #9)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('3200 chemin de la Cote-Sainte-Catherine','Montreal','QC','H3T 1C1','Canada');
UPDATE members
  SET address_id = LAST_INSERT_ID(),
      website = 'https://www.brebeuf.qc.ca/',
      founded_date = '1928-01-01',
      sanctioning_org_id = @rseq_id
  WHERE member_id = 33;


-- ---------- Ontario (OFSAA) ----------

-- #52 Silverthorn Collegiate Institute (Etobicoke, Toronto)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('291 Mill Road','Etobicoke','ON','M9C 1Y5','Canada');
UPDATE members
  SET address_id = LAST_INSERT_ID(),
      website = 'https://silverthornci.com/',
      founded_date = '1964-01-01',
      sanctioning_org_id = @ofsaa_id
  WHERE member_id = 52;

-- #22 Fundy Middle and High School (St. George NB) -> SSNB (org 4)
INSERT INTO addresses (street, city, province, postal_code, country)
  VALUES ('44 Mount Pleasant Road','St. George','NB','E5C 3K4','Canada');
UPDATE members
  SET address_id = LAST_INSERT_ID(),
      website = 'https://fundy.nbed.nb.ca/',
      founded_date = '1978-01-01',
      sanctioning_org_id = 4
  WHERE member_id = 22;


-- #####################################################################
-- PART B : WEBSITE + FOUNDED_DATE  (SSNB/SSNS/PEISAA rows; schema-independent)
-- #####################################################################

-- ---------- Nova Scotia ----------
UPDATE members SET website='https://arhs.ccrce.ca/',          founded_date='1893-01-01' WHERE member_id=2;   -- Amherst Regional
UPDATE members SET website='https://www.armbrae.ns.ca/',      founded_date='1887-01-01' WHERE member_id=3;   -- Armbrae Academy (verify year)
UPDATE members SET website='https://abn.hrce.ca/',            founded_date='1994-01-01' WHERE member_id=4;   -- Auburn Drive
UPDATE members SET website='https://abn.hrce.ca/',            founded_date='1994-01-01' WHERE member_id=5;   -- Auburn Eagles (=#4)
UPDATE members SET website='https://bayv.hrce.ca/',           founded_date=NULL         WHERE member_id=6;   -- Bayview High (verify site/year)
UPDATE members SET website='https://cpa.hrce.ca/',            founded_date='1978-01-01' WHERE member_id=11;  -- Charles P. Allen
UPDATE members SET website='https://chs.hrce.ca/',            founded_date='2007-01-01' WHERE member_id=13;  -- Citadel High
UPDATE members SET website='https://cec.ccrce.ca/',           founded_date='1970-01-01' WHERE member_id=14;  -- Cobequid Educational Centre
UPDATE members SET website='https://chd.hrce.ca/',            founded_date='1982-01-01' WHERE member_id=15;  -- Cole Harbour District High
UPDATE members SET website='https://cpa.hrce.ca/',            founded_date='1978-01-01' WHERE member_id=18;  -- CP Allen Cheetahs (=#11)
UPDATE members SET website='https://dhs.hrce.ca/',            founded_date='1959-01-01' WHERE member_id=19;  -- Dartmouth High
UPDATE members SET website='https://www.hgs.ns.ca/',          founded_date='1958-01-01' WHERE member_id=23;  -- Halifax Grammar (verify year)
UPDATE members SET website='https://hwh.hrce.ca/',            founded_date='1965-01-01' WHERE member_id=24;  -- Halifax West (verify year)
UPDATE members SET website='https://hrh.hrce.ca/',            founded_date='1998-01-01' WHERE member_id=30;  -- Horton Griffins (=#31)
UPDATE members SET website='https://hrh.hrce.ca/',            founded_date='1998-01-01' WHERE member_id=31;  -- Horton High (succeeded Horton District HS 1959)
UPDATE members SET website='https://lhs.hrce.ca/',            founded_date=NULL         WHERE member_id=38;  -- Lockview High (verify year)
UPDATE members SET website='https://mwh.hrce.ca/',            founded_date=NULL         WHERE member_id=40;  -- Millwood Knights (=Millwood High)
UPDATE members SET website='https://nnec.ccrce.ca/',          founded_date=NULL         WHERE member_id=43;  -- North Nova Educational Centre
UPDATE members SET website='https://pvec.ssrce.ca/',          founded_date=NULL         WHERE member_id=45;  -- Park View Education Centre
UPDATE members SET website='https://pah.hrce.ca/',            founded_date='1960-01-01' WHERE member_id=46;  -- Prince Andrew -> Woodlawn High (renamed 2022)
UPDATE members SET website='https://shs.hrce.ca/',            founded_date='1972-01-01' WHERE member_id=50;  -- Sackville High (verify year)
UPDATE members SET website='https://sja.hrce.ca/',            founded_date=NULL         WHERE member_id=54;  -- Sir John A Macdonald
UPDATE members SET website='https://sja.hrce.ca/',            founded_date=NULL         WHERE member_id=55;  -- Sir John A. MacDonald (=#54)
UPDATE members SET website=NULL,                              founded_date=NULL         WHERE member_id=65;  -- Yarmouth Consolidated Memorial (verify site)

-- ---------- New Brunswick ----------
UPDATE members SET website='https://bmhs.nbed.ca/',           founded_date=NULL         WHERE member_id=7;   -- Bernice MacNaughton
UPDATE members SET website='https://cnhs.nbed.ca/',           founded_date=NULL         WHERE member_id=10;  -- Carleton North High
UPDATE members SET website='https://frederictonhigh.nbed.ca/',founded_date=NULL         WHERE member_id=21;  -- Fredericton High (deep historic roots; left NULL to avoid overclaim)
UPDATE members SET website='https://hvhs.nbed.ca/',           founded_date=NULL         WHERE member_id=25;  -- Harbour View High
UPDATE members SET website='https://hths.nbed.ca/',           founded_date=NULL         WHERE member_id=26;  -- Harrison Trimble (spelling variant)
UPDATE members SET website='https://hths.nbed.ca/',           founded_date=NULL         WHERE member_id=27;  -- Harrison Trimble
UPDATE members SET website='https://hths.nbed.ca/',           founded_date=NULL         WHERE member_id=28;  -- Harrison Trimble High
UPDATE members SET website='https://harveyhigh.nbed.ca/',     founded_date=NULL         WHERE member_id=29;  -- Harvey High
UPDATE members SET website='https://jmh.nbed.ca/',            founded_date=NULL         WHERE member_id=32;  -- James M. Hill Memorial
UPDATE members SET website='https://kvhs.nbed.ca/',           founded_date='1975-01-01' WHERE member_id=34;  -- KV Blue Knights (=KV High)
UPDATE members SET website='https://kvhs.nbed.ca/',           founded_date='1975-01-01' WHERE member_id=35;  -- KV Crusaders (=KV High)
UPDATE members SET website='https://kvhs.nbed.ca/',           founded_date='1975-01-01' WHERE member_id=36;  -- Kennebecasis Valley High
UPDATE members SET website='https://leohayeshigh.nbed.ca/',   founded_date='1999-01-01' WHERE member_id=37;  -- Leo Hayes High
UPDATE members SET website='https://mvhs.nbed.ca/',           founded_date=NULL         WHERE member_id=41;  -- Miramichi Valley High
UPDATE members SET website='https://monctonhigh.nbed.ca/',    founded_date='1935-01-01' WHERE member_id=42;  -- Moncton High
UPDATE members SET website='https://ohs.nbed.ca/',            founded_date='1965-01-01' WHERE member_id=44;  -- Oromocto High
UPDATE members SET website='https://rhsroyals.nbed.ca/',      founded_date=NULL         WHERE member_id=47;  -- Riverview High
UPDATE members SET website='https://rhs.nbed.ca/',            founded_date='1998-01-01' WHERE member_id=48;  -- Rothesay High
UPDATE members SET website='https://www.rns.cc/',             founded_date='1877-01-01' WHERE member_id=49;  -- Rothesay Netherwood (verify year)
UPDATE members SET website='https://sjhigh.nbed.ca/',         founded_date=NULL         WHERE member_id=51;  -- Saint John High (oldest public HS in Canada; year left NULL to avoid overclaim)
UPDATE members SET website='https://simonds.nbed.ca/',        founded_date=NULL         WHERE member_id=53;  -- Simonds High
UPDATE members SET website='https://stm.nbed.ca/',            founded_date=NULL         WHERE member_id=57;  -- St. Malachy's Memorial
UPDATE members SET website='https://sshs.nbed.ca/',           founded_date=NULL         WHERE member_id=58;  -- St. Stephen High
UPDATE members SET website='https://sshs-sugarloaf.nbed.ca/', founded_date=NULL         WHERE member_id=59;  -- Sugarloaf Senior High (verify site)
UPDATE members SET website='https://srhs.nbed.ca/',           founded_date=NULL         WHERE member_id=60;  -- Sussex Regional High
UPDATE members SET website='https://whs.nbed.ca/',            founded_date=NULL         WHERE member_id=63;  -- Woodstock High
UPDATE members SET website='https://whs.nbed.ca/',            founded_date=NULL         WHERE member_id=64;  -- Woodstock Thunder (=#63)

-- ---------- Prince Edward Island ----------
UPDATE members SET website='https://bluefield.edu.pe.ca/',    founded_date=NULL         WHERE member_id=8;   -- Bluefield High
UPDATE members SET website='https://therural.edu.pe.ca/',     founded_date='1966-01-01' WHERE member_id=12;  -- Charlottetown Rural
UPDATE members SET website='https://colonelgray.edu.pe.ca/',  founded_date='1966-01-01' WHERE member_id=16;  -- Colonel Gray #2 (=#17)
UPDATE members SET website='https://colonelgray.edu.pe.ca/',  founded_date='1966-01-01' WHERE member_id=17;  -- Colonel Gray High
UPDATE members SET website='https://threeoaks.edu.pe.ca/',    founded_date='1976-01-01' WHERE member_id=62;  -- Three Oaks Senior High


-- #####################################################################
-- PART C : NAME CORRECTION (#1)
-- #####################################################################
-- ADDENDUM (clarification on #1)
-- "Alma Academy" / "Academie Alma" was identified as the JEANNOIS,
-- the collegial basketball team of COLLEGE D'ALMA (CEGEP, Alma QC,
-- Lac-Saint-Jean) competing in RSEQ. The institution is the same
-- College d'Alma already enriched above (675 boul. Auger Ouest).
--
-- Recommended: name the member_org row after the INSTITUTION, and let
-- the "Jeannois" team live in the Team table linked to this member_id.
-- The address/website/founded/org link set above remain correct.
-- =====================================================================
UPDATE members
  SET name = 'College d''Alma'      -- was 'Alma Academy'; rename to the institution
  WHERE member_id = 1;


-- #####################################################################
-- ROWS NOT UPDATED
-- #####################################################################
--  #61 TBD  -> intentional placeholder, left untouched.
--
-- All other rows (1-65) are enriched above. Duplicates were filled
-- as-is per your instruction and can be merged later.
-- =====================================================================
