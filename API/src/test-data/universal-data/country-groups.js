export async function createCountryGroups () {
	await AKSO.db('countries_groups')
		.insert([
			/*eslint-disable */
			{"code":"x01","name":"Landaro 1"},
			{"code":"x02","name":"Landaro 2"},
			{"code":"x03","name":"Landaro 3"},
			{"code":"x04","name":"Landaro 4"},
			{"code":"x05","name":"Landaro 5"}
			/*eslint-enable */
		]);

	await AKSO.db('countries_groups_members')
		.insert([
			/*eslint-disable */
			{"group_code":"x05","country_code":"ac"},
			{"group_code":"x05","country_code":"ad"},
			{"group_code":"x05","country_code":"ae"},
			{"group_code":"x01","country_code":"af"},
			{"group_code":"x03","country_code":"ag"},
			{"group_code":"x04","country_code":"ai"},
			{"group_code":"x02","country_code":"al"},
			{"group_code":"x02","country_code":"am"},
			{"group_code":"x02","country_code":"ao"},
			{"group_code":"x03","country_code":"ar"},
			{"group_code":"x05","country_code":"as"},
			{"group_code":"x05","country_code":"at"},
			{"group_code":"x05","country_code":"au"},
			{"group_code":"x04","country_code":"aw"},
			{"group_code":"x05","country_code":"ax"},
			{"group_code":"x02","country_code":"az"},
			{"group_code":"x02","country_code":"ba"},
			{"group_code":"x04","country_code":"bb"},
			{"group_code":"x01","country_code":"bd"},
			{"group_code":"x05","country_code":"be"},
			{"group_code":"x02","country_code":"bf"},
			{"group_code":"x02","country_code":"bg"},
			{"group_code":"x04","country_code":"bh"},
			{"group_code":"x01","country_code":"bi"},
			{"group_code":"x01","country_code":"bj"},
			{"group_code":"x05","country_code":"bl"},
			{"group_code":"x05","country_code":"bq"},
			{"group_code":"x05","country_code":"bm"},
			{"group_code":"x04","country_code":"bn"},
			{"group_code":"x02","country_code":"bo"},
			{"group_code":"x03","country_code":"br"},
			{"group_code":"x04","country_code":"bs"},
			{"group_code":"x02","country_code":"bt"},
			{"group_code":"x02","country_code":"bw"},
			{"group_code":"x02","country_code":"by"},
			{"group_code":"x02","country_code":"bz"},
			{"group_code":"x05","country_code":"ca"},
			{"group_code":"x05","country_code":"cc"},
			{"group_code":"x01","country_code":"cd"},
			{"group_code":"x01","country_code":"cf"},
			{"group_code":"x01","country_code":"cg"},
			{"group_code":"x05","country_code":"ch"},
			{"group_code":"x01","country_code":"ci"},
			{"group_code":"x04","country_code":"ck"},
			{"group_code":"x03","country_code":"cl"},
			{"group_code":"x01","country_code":"cm"},
			{"group_code":"x03","country_code":"cn"},
			{"group_code":"x02","country_code":"co"},
			{"group_code":"x03","country_code":"cr"},
			{"group_code":"x02","country_code":"cu"},
			{"group_code":"x02","country_code":"cv"},
			{"group_code":"x04","country_code":"cw"},
			{"group_code":"x05","country_code":"cx"},
			{"group_code":"x04","country_code":"cy"},
			{"group_code":"x04","country_code":"cz"},
			{"group_code":"x05","country_code":"de"},
			{"group_code":"x01","country_code":"dj"},
			{"group_code":"x05","country_code":"dk"},
			{"group_code":"x02","country_code":"dm"},
			{"group_code":"x02","country_code":"do"},
			{"group_code":"x02","country_code":"dz"},
			{"group_code":"x02","country_code":"ec"},
			{"group_code":"x04","country_code":"ee"},
			{"group_code":"x02","country_code":"eg"},
			{"group_code":"x02","country_code":"eh"},
			{"group_code":"x01","country_code":"er"},
			{"group_code":"x04","country_code":"es"},
			{"group_code":"x01","country_code":"et"},
			{"group_code":"x05","country_code":"fi"},
			{"group_code":"x02","country_code":"fj"},
			{"group_code":"x05","country_code":"fk"},
			{"group_code":"x02","country_code":"fm"},
			{"group_code":"x05","country_code":"fo"},
			{"group_code":"x05","country_code":"fr"},
			{"group_code":"x02","country_code":"ga"},
			{"group_code":"x05","country_code":"gb"},
			{"group_code":"x03","country_code":"gd"},
			{"group_code":"x02","country_code":"ge"},
			{"group_code":"x05","country_code":"gf"},
			{"group_code":"x05","country_code":"gg"},
			{"group_code":"x01","country_code":"gh"},
			{"group_code":"x05","country_code":"gi"},
			{"group_code":"x05","country_code":"gl"},
			{"group_code":"x01","country_code":"gm"},
			{"group_code":"x01","country_code":"gn"},
			{"group_code":"x04","country_code":"gp"},
			{"group_code":"x03","country_code":"gq"},
			{"group_code":"x04","country_code":"gr"},
			{"group_code":"x05","country_code":"gs"},
			{"group_code":"x02","country_code":"gt"},
			{"group_code":"x05","country_code":"gu"},
			{"group_code":"x01","country_code":"gw"},
			{"group_code":"x02","country_code":"gy"},
			{"group_code":"x05","country_code":"hk"},
			{"group_code":"x05","country_code":"hm"},
			{"group_code":"x02","country_code":"hn"},
			{"group_code":"x03","country_code":"hr"},
			{"group_code":"x01","country_code":"ht"},
			{"group_code":"x03","country_code":"hu"},
			{"group_code":"x02","country_code":"id"},
			{"group_code":"x05","country_code":"ie"},
			{"group_code":"x05","country_code":"il"},
			{"group_code":"x05","country_code":"im"},
			{"group_code":"x01","country_code":"in"},
			{"group_code":"x05","country_code":"io"},
			{"group_code":"x02","country_code":"iq"},
			{"group_code":"x02","country_code":"ir"},
			{"group_code":"x05","country_code":"is"},
			{"group_code":"x05","country_code":"it"},
			{"group_code":"x05","country_code":"je"},
			{"group_code":"x02","country_code":"jm"},
			{"group_code":"x02","country_code":"jo"},
			{"group_code":"x05","country_code":"jp"},
			{"group_code":"x02","country_code":"ke"},
			{"group_code":"x01","country_code":"kg"},
			{"group_code":"x01","country_code":"kh"},
			{"group_code":"x01","country_code":"ki"},
			{"group_code":"x01","country_code":"km"},
			{"group_code":"x04","country_code":"kn"},
			{"group_code":"x01","country_code":"kp"},
			{"group_code":"x04","country_code":"kr"},
			{"group_code":"x04","country_code":"kw"},
			{"group_code":"x05","country_code":"ky"},
			{"group_code":"x02","country_code":"kz"},
			{"group_code":"x02","country_code":"la"},
			{"group_code":"x03","country_code":"lb"},
			{"group_code":"x03","country_code":"lc"},
			{"group_code":"x05","country_code":"li"},
			{"group_code":"x02","country_code":"lk"},
			{"group_code":"x01","country_code":"lr"},
			{"group_code":"x01","country_code":"ls"},
			{"group_code":"x03","country_code":"lt"},
			{"group_code":"x05","country_code":"lu"},
			{"group_code":"x03","country_code":"lv"},
			{"group_code":"x02","country_code":"ly"},
			{"group_code":"x02","country_code":"ma"},
			{"group_code":"x05","country_code":"mc"},
			{"group_code":"x01","country_code":"md"},
			{"group_code":"x02","country_code":"me"},
			{"group_code":"x05","country_code":"mf"},
			{"group_code":"x01","country_code":"mg"},
			{"group_code":"x02","country_code":"mh"},
			{"group_code":"x02","country_code":"mk"},
			{"group_code":"x01","country_code":"ml"},
			{"group_code":"x01","country_code":"mm"},
			{"group_code":"x02","country_code":"mn"},
			{"group_code":"x05","country_code":"mo"},
			{"group_code":"x05","country_code":"mp"},
			{"group_code":"x04","country_code":"mq"},
			{"group_code":"x01","country_code":"mr"},
			{"group_code":"x03","country_code":"ms"},
			{"group_code":"x04","country_code":"mt"},
			{"group_code":"x03","country_code":"mu"},
			{"group_code":"x03","country_code":"mv"},
			{"group_code":"x01","country_code":"mw"},
			{"group_code":"x03","country_code":"mx"},
			{"group_code":"x03","country_code":"my"},
			{"group_code":"x01","country_code":"mz"},
			{"group_code":"x02","country_code":"na"},
			{"group_code":"x05","country_code":"nc"},
			{"group_code":"x01","country_code":"ne"},
			{"group_code":"x05","country_code":"nf"},
			{"group_code":"x01","country_code":"ng"},
			{"group_code":"x01","country_code":"ni"},
			{"group_code":"x05","country_code":"nl"},
			{"group_code":"x05","country_code":"no"},
			{"group_code":"x01","country_code":"np"},
			{"group_code":"x03","country_code":"nr"},
			{"group_code":"x02","country_code":"nu"},
			{"group_code":"x05","country_code":"nz"},
			{"group_code":"x03","country_code":"om"},
			{"group_code":"x03","country_code":"pa"},
			{"group_code":"x02","country_code":"pe"},
			{"group_code":"x04","country_code":"pf"},
			{"group_code":"x02","country_code":"pg"},
			{"group_code":"x02","country_code":"ph"},
			{"group_code":"x01","country_code":"pk"},
			{"group_code":"x03","country_code":"pl"},
			{"group_code":"x05","country_code":"pm"},
			{"group_code":"x05","country_code":"pn"},
			{"group_code":"x04","country_code":"pr"},
			{"group_code":"x02","country_code":"ps"},
			{"group_code":"x04","country_code":"pt"},
			{"group_code":"x03","country_code":"pw"},
			{"group_code":"x02","country_code":"py"},
			{"group_code":"x05","country_code":"qa"},
			{"group_code":"x04","country_code":"re"},
			{"group_code":"x03","country_code":"ro"},
			{"group_code":"x02","country_code":"rs"},
			{"group_code":"x03","country_code":"ru"},
			{"group_code":"x01","country_code":"rw"},
			{"group_code":"x04","country_code":"sa"},
			{"group_code":"x01","country_code":"sb"},
			{"group_code":"x04","country_code":"sc"},
			{"group_code":"x01","country_code":"sd"},
			{"group_code":"x05","country_code":"se"},
			{"group_code":"x04","country_code":"sg"},
			{"group_code":"x05","country_code":"sh"},
			{"group_code":"x04","country_code":"si"},
			{"group_code":"x05","country_code":"sj"},
			{"group_code":"x04","country_code":"sk"},
			{"group_code":"x01","country_code":"sl"},
			{"group_code":"x05","country_code":"sm"},
			{"group_code":"x01","country_code":"sn"},
			{"group_code":"x01","country_code":"so"},
			{"group_code":"x02","country_code":"sr"},
			{"group_code":"x01","country_code":"ss"},
			{"group_code":"x01","country_code":"st"},
			{"group_code":"x02","country_code":"sv"},
			{"group_code":"x05","country_code":"sx"},
			{"group_code":"x01","country_code":"sy"},
			{"group_code":"x02","country_code":"sz"},
			{"group_code":"x05","country_code":"ta"},
			{"group_code":"x04","country_code":"tc"},
			{"group_code":"x01","country_code":"td"},
			{"group_code":"x05","country_code":"tf"},
			{"group_code":"x01","country_code":"tg"},
			{"group_code":"x02","country_code":"th"},
			{"group_code":"x01","country_code":"tj"},
			{"group_code":"x01","country_code":"tl"},
			{"group_code":"x05","country_code":"tk"},
			{"group_code":"x02","country_code":"tm"},
			{"group_code":"x02","country_code":"tn"},
			{"group_code":"x02","country_code":"to"},
			{"group_code":"x03","country_code":"tr"},
			{"group_code":"x04","country_code":"tt"},
			{"group_code":"x02","country_code":"tv"},
			{"group_code":"x04","country_code":"tw"},
			{"group_code":"x01","country_code":"tz"},
			{"group_code":"x01","country_code":"ua"},
			{"group_code":"x01","country_code":"ug"},
			{"group_code":"x05","country_code":"um"},
			{"group_code":"x05","country_code":"us"},
			{"group_code":"x04","country_code":"uy"},
			{"group_code":"x01","country_code":"uz"},
			{"group_code":"x05","country_code":"va"},
			{"group_code":"x02","country_code":"vc"},
			{"group_code":"x03","country_code":"ve"},
			{"group_code":"x05","country_code":"vg"},
			{"group_code":"x05","country_code":"vi"},
			{"group_code":"x01","country_code":"vn"},
			{"group_code":"x02","country_code":"vu"},
			{"group_code":"x05","country_code":"wf"},
			{"group_code":"x02","country_code":"ws"},
			{"group_code":"x01","country_code":"ye"},
			{"group_code":"x05","country_code":"yt"},
			{"group_code":"x02","country_code":"za"},
			{"group_code":"x01","country_code":"zm"},
			{"group_code":"x01","country_code":"zw"},
			{"group_code":"x02","country_code":"xk"},
			/*eslint-enable */
		]);
}
