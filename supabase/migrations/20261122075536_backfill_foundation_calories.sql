-- The October 2026 Foundation Foods release has no energy amount for
-- these entries. USDA links them to the April 2018 SR Legacy records
-- below through the same NDB number. Use the linked energy (kcal/100 g)
-- only when there is no Foundation Foods value.
-- https://fdc.nal.usda.gov/download-datasets/
-- https://fdc.nal.usda.gov/Foundation_Foods_Documentation/
update public.foundation_foods as foundation
set kcal_per_100g = legacy.kcal_per_100g
from (values
  (746775,  173468), -- NDB 02047: table salt
  (748278,  172336), -- NDB 04582: canola oil
  (748323,  171029), -- NDB 04518: corn oil
  (748366,  171411), -- NDB 04044: soybean oil
  (789828,  173430), -- NDB 01145: unsalted butter
  (790508,  173410), -- NDB 01001: salted butter
  (1750348, 171410), -- NDB 04042: peanut oil
  (1750350, 171027), -- NDB 04511: safflower oil
  (2727581, 173946), -- NDB 09042: raw blackberries
  (2758976, 171723), -- NDB 09079: sweetened dried cranberries
  (2758978, 168162), -- NDB 09291: prunes
  (2758979, 168164), -- NDB 09297: golden seedless raisins
  (2758980, 168165), -- NDB 09298: dark seedless raisins
  (2758981, 168411), -- NDB 11212: frozen prepared edamame
  (2758987, 171019)  -- NDB 04114: regular Italian dressing
) as linked(foundation_id, legacy_id)
join public.sr_legacy_foods as legacy on legacy.fdc_id = linked.legacy_id
where foundation.fdc_id = linked.foundation_id
  and foundation.kcal_per_100g is null
  and legacy.kcal_per_100g is not null;
