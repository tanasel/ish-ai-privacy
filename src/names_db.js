/*
 * Common given names and surnames used by the offline list matcher.
 *
 * Coverage was deliberately assembled across more than 50 national traditions:
 * Dutch, Belgian, British, Irish, American, Canadian, Australian, French, German,
 * Austrian, Swiss, Spanish, Portuguese, Italian, Greek, Icelandic, Norwegian,
 * Swedish, Danish, Finnish, Estonian, Latvian, Lithuanian, Polish, Czech, Slovak,
 * Hungarian, Romanian, Bulgarian, Croatian, Serbian, Bosnian, Slovenian, Albanian,
 * Russian, Ukrainian, Belarusian, Georgian, Armenian, Turkish, Azerbaijani, Kazakh,
 * Uzbek, Persian, Afghan, Egyptian, Moroccan, Algerian, Tunisian, Lebanese, Syrian,
 * Jordanian, Iraqi, Saudi, Israeli, Indian, Pakistani, Bangladeshi, Sri Lankan,
 * Nepali, Chinese, Japanese, Korean, Vietnamese, Thai, Indonesian, Malaysian,
 * Filipino, Burmese, Cambodian, Nigerian, Ghanaian, Kenyan, Ethiopian, Eritrean,
 * Somali, South African, Zimbabwean, Ugandan, Tanzanian, Rwandan and Senegalese.
 *
 * Every stored spelling is lowercase ASCII (NFD diacritics removed). Alternative
 * romanizations are retained because they are distinct spellings in real records.
 */
const PII_NAMES_DB = (() => {
  'use strict';

  function unique(chunks) {
    return Array.from(new Set(chunks.join(' ').trim().split(/\s+/).filter(Boolean)));
  }

  const first = unique([
    // Anglophone and Irish
    `aaron abigail ada adam adelaide adele adrian aidan aileen alana alan albert alec alex alexa alexander alexandra
    alexis alice alicia alison allison alma alvin amanda amber amelia amy ana andrew angela angelina angus anita ann
    anna annabelle anne annette anthony antonia archer archie ariana ariel arthur ashley ashton audrey austin ava
    barbara barry beatrice bella ben benedict benjamin bernard beth bethany betty beverly billie blake bonnie bradley
    brandon brenda brendan brian brianna bridget brittany brooke bruce bryan caleb callum cameron carl caroline carol
    carolyn carrie casey catherine cathy charles charlie charlotte cheryl chloe chris christian christina christine
    christopher claire clara clarence claudia clifford clive colin connor constance craig curtis cynthia daisy dale
    damian daniel danielle danny daphne darcy darren david dawn dean deborah debra denise dennis derek diana diane
    dominic donna dorothy douglas duncan dylan edgar edith edmund edward edwin eileen elaine eleanor elijah eliot
    elizabeth ella ellen ellie elliot emily emma eric erica erin ethan eugene eva evelyn faith felicity finlay fiona
    florence frances francis frank frederick gabriel gail garrett gary gavin gemma george georgia gerald gerard gillian
    glen glenn gloria grace graham grant greg gregory gwendolyn harold harriet harry hazel heather helen henry holly
    hugh ian imogen irene iris isaac isabel isabella jack jackson jacob jade james jamie jane janet janice jared jasmine
    jason jean jeffrey jennifer jeremy jessica jill joan joanna jocelyn joe joel john jonathan jordan joseph josephine
    joshua joyce judith julia julian julie june justin karen katherine kathleen kathryn katie kay keith kelly kenneth
    kerry kevin kimberly kirsten kyle laura lauren lawrence leah leonard leslie liam lillian lily linda lindsay lisa
    lois loretta louise lucas lucy luke lydia mabel madeline maeve malcolm marcus margaret maria marian marilyn marion
    marjorie martin mary mason matthew maureen max megan melanie melissa michael michelle mildred molly monica morgan
    nancy natalie neil nicholas nicole noah nora norman oliver olivia oscar owen pamela patricia patrick paul paula
    pauline penelope peter philip phoebe rachel ralph raymond rebecca reginald renee rhys richard riley rita robert
    robin roger ronald rosa rose rosemary roxanne ruby russell ruth ryan sabrina samantha samuel sandra sara sarah
    scarlett scott sean sebastian shane shannon shaun sheila shirley simon sophia sophie stanley stephanie stephen
    steven stuart susan suzanne sylvia teresa terrence theodore theresa thomas timothy tracey trevor tristan valerie
    vanessa veronica victor victoria vincent violet vivian wade walter warren wayne wendy william winifred yvonne zachary`,

    // Spanish, Portuguese and Latin American
    `abdon abelardo adelaida adelina agustin aitana alba alejandro alejandra alfonso alfredo alonso alvaro amalia amparo
    anabel anahi andres antonio araceli ariadna armando arturo beatriz belen benito berenice blanca braulio bruno camila
    caridad carla carlos carmen catalina cecilia celeste cesar ciro concepcion consuelo cristian cristobal
    damaso debora diego dolores domingo eduardo elena elisa elvira emilio enrique ernesto esperanza esteban eugenia
    eusebio fabian facundo federico felipe fernando fidel francisco gabriela gaspar gerardo gonzalo graciela guadalupe
    guillermo gustavo hector hernan hilario hugo ignacio ines irma isidro ivan javier jeronimo joaquin jorge jose josefa
    juan juana julieta lautaro leandro leticia lorena lorenzo lucia luciana luisa luz manuel marcela marcelo margarita
    mariano mariela marina mario marisol mateo matias mauricio maximiliano mercedes micaela miguel milagros natalia
    nicolas noe noelia norma octavio orlando osvaldo pablo paloma patricio pilar ramiro raul renata ricardo rocio
    rodolfo rodrigo rosario ruben salvador santiago sebastian sergio silvia soledad tamara valentina valeria vicente
    ximena yamila yolanda adriano afonso alcides amadeu anabela anibal augusto aurelio bruna caetano candida carolina
    celia cidalia claudio cristiano davi dinis diogo domingos duarte fatima fernanda filipa filipe francisca goncalo
    helena horacio ines joana joao joaquim luis madalena mafalda manuela margarida martim miguel nelson nuno patricia
    pedro rafael renato rui sandro teresa tiago tomas vasco vitor`,

    // French and Francophone
    `adrien agathe alain alban alix amandine amelie anaelle anais antoine armand arnaud audrey aurelie baptiste bastien
    benoit berenice bernadette bertrand brigitte camille candice capucine cedric celestin celine chantal charlene
    charlotte christophe clement cloe clotilde coralie corentin damien delphine didier elodie emeline emmanuel emmanuelle
    etienne fabien fabienne florent florence francois francoise frederic gaelle gaston gauthier genevieve geoffroy
    geraldine ghislain gilles guillaume guy heloise henri hugo jacques jeanette jeanne jocelyne jonas julien laure
    laurence lea leon leo lilou lionel loic lorraine luc lucie ludovic madeleine manon marcel margaux margot marine
    mathilde mathieu maud maxence melanie melody michel michele mireille monique muriel nadege nathalie noemie olivier
    pascal pascale philippe pierre quentin rene romain sabine sandrine sebastien severine solene stephane sylvain
    sylvie thierry valentin valentine veronique virginie xavier yann yannick yves zoe`,

    // Dutch, Flemish, German, Austrian and Swiss
    `aafke aart abel achim adelheid adriaan albrecht anke annelies annemarie annette ans arjen arnold barbel bart bas
    bastiaan benno benthe berend bernhard bert berta bianca bram brigitte carina carsten caspar cornelis cornelia
    dagmar detlef diederik dieter dirk edeltraud edith edo egbert elke els emiel erwin esther eva evelien femke fenne
    floor floortje fokke frauke friedrich frits geert geertje gerben gerd gerda gerhard gerrit gesine gisela greta
    gunter guido hannelore hans harm harro heidi hein hendrik henk henriette herman hilde inge ingrid irene irmgard
    janneke jeroen jochen joep johann johanna johannes jonas joris jorrit jutta kai karin karl karsten katja kees kerstin
    klaas klaus koen konrad lars lieke liesbeth lien lotte ludger luuk maarten malte marieke marijke marinus markus
    marleen martijn mathias matthias meike merel mieke mies niels niklas otto paulien petra pieter ralf reinder roel
    roos ruud sabine sander saskia sebastiaan silke silvia sjoerd stefanie stefan stijn susanne sven swen tanja theo
    thorsten tineke tobias tom trudy uwe veerle vera willem wilma wim wouter yannick yvonne`,

    // Italian and Greek
    `achille ada adolfo agnese alessandro alessandra alessia alfio alfredo alice amadeo ambra amedeo angelo annalisa
    annamaria antonella antonino beatrice benedetta biagio carmine caterina chiara ciro claudio corrado cosimo cristina
    daniela dario davide debora domenico donatella edoardo elisabetta emanuele emiliano enrico enzo fabrizio fausto
    federica ferruccio filippo fiorella flavia flavio francesca franco gaetano gaia gemma gennaro giorgia giorgio giovanna
    giovanni giuliana giuliano giulio grazia ilaria irene laura lavinia leonardo letizia livia lorena lorenza luca
    luciano lucrezia manuela marcello marco mariangela marianna marilena massimo matteo michela michele mirko monica
    nadia nicola nicoletta nunzio ornella paola paolo patrizia pierluigi pietro raffaele renzo riccardo roberta roberto
    romina rosanna rossella salvatore saverio serena simona stefania tiziana umberto valentina valerio vincenzo viola
    agapi agathi aggelos alexandros alexia alkis anastasia anastasios andreas angeliki antonis apostolos argyris athanasios
    athina charalampos christina christos demetra dimitris eirini eleftheria eleni evangelos fotini georgia giannis
    giorgos ilias ioanna iraklis katerina konstantina konstantinos kyriakos lampros lefteris maria marilena michalis
    nikiforos nikos panagiotis paraskevi pavlos petros sofia sotiris spyridon stavros thanasis theodora vasiliki vasilis
    xenia yiannis yorgos`,

    // Nordic and Finnish
    `aage aino aleksi anders anja anneli annika arne arto asbjorn astrid benedicte birgit birgitta bjorn bo bodil
    carina carsten dag dorte ebba eero eija einar eirik elin elina elisabet emil erik erland esa freja frida goran
    grete gudrun gunnar hannah hans hege helga helmi henrik ilkka ingvar isak janne jari jarmo jens johanna
    joonas jorgen jorunn juha juhani juho kaarina kai kalevi kari karina katri keijo keld kirsti kristian kristina
    kristoffer lasse leena leif linnea lisbeth liv maarit magnus mads marit mats matti mette miika mikko mona nanna
    niina ninna odd ola olav olli per pernille petri priit ragnar rasmus riikka rolf rune saara sanna sanni seppo signe
    sigrid sinikka sirpa siv stian stig susanna svein tapio tarja terhi timo tommi torbjorn tuomas ulla veikko veli
    vesa ville yrjo asa ake`,

    // Central Europe, Baltics and Balkans
    `agnieszka alicja amadeusz andrzej aneta aniela antoni arkadiusz bartek bartlomiej beata blazej bogdan bogumil
    bohdan bozenna czeslaw dagmara dariusz dominika dorota edyta elzbieta ewa filip grzegorz halina henryk hubert
    izabela jadwiga jakub janina jaroslaw jerzy joanna joachim jolanta julita kacper kamil karol karolina kasia
    katarzyna kazimierz kinga krystyna kuba lech leszek lucja lukasz maciej magda magdalena malgorzata mariusz mateusz
    michal mikolaj milena monika natalia norbert olga patrycja pawel piotr przemyslaw rafal renata ryszard stanislaw
    szymon tadeusz tomasz urszula waldemar wanda weronika wojciech zbigniew zofia zuzanna
    alena ales barbora bohumil bohuslav dagmar danica denisa dominik dusan eliska frantisek hana helena honza iva
    ivana jaromir jiri jitka josef kamila karel katerina klara kristyna lenka libor lubomir ludmila marcel marek
    milan milena miroslav monika ondrej otakar pavla premysl radek radka roman rostislav simona stanislav stepan
    tereza tomas vaclav vendula veronika viktor vojtech zdenek zuzana
    adam bela bence boglarka botond csaba dorottya edit emese eniko erzsebet eszter ferenc gabor gergely gyorgy
    hajnalka ildiko imre istvan janos jozsef katalin kristof laszlo levente lilla margit marton miklos noemi orsolya
    reka sandor szabolcs szilvia tamas tibor zoltan zsofia zsolt zsuzsa
    adina alin amalia ana anca andrei bogdan camelia catalin ciprian claudiu codrin corina cosmin costin cristina
    cristi daniela dragos dumitru elena florin gabriela gheorghe ileana ioan ion irina iulia laurentiu liviu lucian
    luminita madalina marian mariana mihai mirela mircea monica nicolae oana octavian radu raluca razvan rodica
    roxana simona sorin stefania teodor valentin vasile viorel
    aivar andris ansis arnis baiba daiga dainis edgars egils elina giedre ginta gintare guntis ilze inga janis
    jurgen juris kadri kaia kalev kaspars kristaps laima laura liis maarika madis maris martins raivo rasa renars
    ruta siim taavi tarmo tiina toomas uldis vaida vallo vytautas zane`,

    // South Slavic, Albanian, Bulgarian
    `adelina aleksandar aleksandra aleksej amra ana anamarija andrej anja anto anton antonija bojan boris bojana
    branimir branko danijel danijela darko dejan dino dragan dragana dusan edina emir emina filip goran gordana
    hrvoje ivan ivana ivica ivona jasmina jelena josip jovana jovica karlo katarina kresimir kristijan lela ljiljana
    luka maja marija marin marko matej milan milena milica milos mirjana mladen nadja natasa nenad nikola nina
    petar ranko sanja sasa slavica slobodan snezana stefan stjepan tamara tomislav vesna vladimir zoran zorica
    agron albana arben arber ardita ardit besart besnik blerta bledar dardan donika elira enver erion ermal fatmir
    gentian ilir jetmir klodian lirim luan majlinda mentor olti rudina sabri shkelzen valbona valon vjollca
    blaga bozhidar desislava dimitar dobrin elitsa galina georgi hristo ivelina kalina kaloyan krasimir kristina
    lubomir lyubov maria mikhail nadezda nikolay petya plamen radostin rumyana svetla tsvetan valeri yordan zhivko`,

    // Russian, Ukrainian and Belarusian transliterations
    `agafya aleksei alexei alexey alyona anastasia anatoli anatoly andrei andrey angelina anna anton arina arkadi
    arkady arseniy artyom boris borislav darya daria denis dmitri dmitry eduard ekaterina elena elizaveta evgeni
    evgenia evgeniy fedor fyodor galina gennadi gennady grigori grigory igor ilya inna irina ivan karina katerina
    kirill konstantin kseniya larisa leonid lev lilia liliya lubov ludmila maksim marina maria mariya mark matvei
    mikhail mila nadezhda natalia natalya nikita nikolai nikolay nina oleg olena oksana olga pavel polina pyotr
    raisa roman rostislav ruslan sergei sergey sofia sofya stanislav svetlana tamara tatiana tatyana timofei vadim
    valentin valentina valeri valery vasili vasily vera veronika viktor viktoria vitali vitaliy vladimir vladislav
    vyacheslav yaroslav yelena yevgeny yulia yuri yuriy zhanna zoya
    alia alyona anastasiya andriy bohdana bohdan danylo daryna halyna hryhoriy ihor iryna kateryna khariton kyrylo
    lesia liubov liudmyla maksym mariia maryna mykola nataliya nazar oleksandr oleksandra oleksii olena ostap petro
    roksolana serhii solomiya svitlana taras tetiana viktoriia vitalii volodymyr yaroslava yevhen yevheniia yuliia
    aliaksandr alina arciom darja dzmitry hanna ilya kasia katsiaryna maksim mikalai nasta palina siarhei tatsiana`,

    // Arabic, Maghrebi and Levantine, with common transliterations
    `aaliyah abbas abdallah abdel abdellah abdelrahman abderrahmane abdul abdullah abdurrahman abid adil adnan afaf
    ahmad ahmed aicha aida aisha akram ala alia ali amal amina amine amir amira anis anisa anwar arwa asad asma
    ayesha ayoub aziz badr basel bassem bassim bilal bintou bushra chaima chayma dalal danya dina ehab elias farah
    fares farid farida fatema fatima fatimah fawaz fawzi fayez faysal fidaa fouad ghada ghassan habib hadi hafsa
    haidar hakim hala hamid hamza hana hanan hani haroun hassan hatem haytham hiba hisham husam hussein ibrahim
    ihab ikram imad iman ines isam ismail jamal jamila jamil karim karima khaled khalid khalil khadija khadijah
    lamia lama latifa layla leila lina lubna mahdi mahmoud majid malak manal maram mariam marwan maryam mehdi
    mohamed mohammad mohammed mohamad muhammad muhammed mustafa moustafa mounir muna munir nadia nadim nadine
    nabil nada nael naima najat najib nasser nasir nawal nazim nour noura omar othman qasim racha rami rana rania
    rashad rashid reem rima saad sabah sabir sabrina safaa said salim salma samer samir samira sana sara selim
    shaimaa sharif sherif souad taha talal tarek tariq walid wafaa yahya yasin yasser yasir yazan younes yousef
    youssef yusuf zakaria zaynab zeinab ziad ziyad zoheir`,

    // Turkish, Kurdish, Persian, Afghan and Central Asian
    `adem ahmet ayhan aylin ayse azra baran berk berna burak busra can cem cenk ceren ceyda cagla deniz derya
    dilara elif emine emre enes ercan erdem eren erhan esra evren ezgi fatih ferhat funda gokhan gokce gul gulay
    hakan halil hatice hazal hilal hulya ibrahim ilker irmak kaan kadir kamil kerem koray kubra leyla mehmet melih
    melike mert mine murat mustafa nazli neslihan nihal nuray omer onur orhan osman ozan ozge pinar recep selin
    sema serap serdar sevgi sevval sinan songul suleyman tolga tuba tugba ugur umut volkan yasar yasemin yavuz
    yilmaz zeynep
    afshin ali asghar azadeh bahar behnam behrouz bijan dariush davood ehsan elham farhad fariba farid fereshteh
    golnaz hamid hassan hossein jafar jalal jamshid kamran kaveh leila mahsa mahyar majid mani maryam masoud mehran
    mehdi mitra mohsen morteza nader nasrin navid negar nima omid parisa parviz payam peyman pouya ramina reza
    roya sahar saeed saman sara sepideh shadi shahram shirin sina sohrab soraya vahid yasaman zahra
    aram arash avan barzan berfin botan delal dilar rojda rojhat ronahi shervan soran zana zilan
    aibek aigul ainur akmaral altynai arman asel aslan azamat bakyt bekzat bolat damir dana dariga dinara eldar
    elmira farida gulmira kanat kairat kamila madina marat nargiz nazgul nurlan olzhas ruslan saltanat serik
    timur yerlan zhanar zukhra dilshod feruza gulnara jasur nodira odil ravshan sardor shakhnoza umida`,

    // Hebrew, Armenian, Georgian and Azerbaijani
    `aaron abigail adina aharon alon amit anat ariel avigail avital avraham ayala boaz chen dafna dalia dan daniel
    daphna david dorit efrat eli eliana eliezer esther ezra gal gadi gil hada hadar haggai ilan irit itai jael lior
    maayan meir michal miriam miri moshe naama nadav natalie noa noam ofer orit rachel ran rina rivka ronit shai
    sharon shira shlomo tal tamar tzipora uri yaakov yael yair yehuda yonatan yosef yossi yuval
    anahit ani armen arman arpine artak arthur ashot avetis davit edgar elina emil garik gayane gevorg gor hakob
    harutyun hasmik hayk hrachya karen khachatur lilit lusine mane mariam mher narek narine sargis siranu shant
    sona susanna tatev tigran vahan vahram vardaan zaruhi
    ana badri beka davit eka elene giorgi gia givi irakli kakha ketevan levan luka maia makvala malkhaz mamuka
    manana mariam merab nata nika niko nodar nugzar paata rusudan salome sophiko tamaz tea temur tinatin vakhtang
    aysel anar arif aygun bahruz elchin emin fariz fuad gunay ilgar javid kamal lale leyla narmin orxan rashad
    rovshan sabina samir sevda taleh tural vugar zaur`,

    // South Asia: Indian, Pakistani, Bangladeshi, Sri Lankan and Nepali
    `aadil aarav aarti aasha abhay abhishek adarsh aditi aditya ajay ajit akash akhil akshay alok aman amar amardeep
    amit amita anand ananya anil anish anita anjali ankita ankur anshul anu anup anurag anusha aparna arjun arnav
    arun aruna asha ashish ashok avinash ayush babita balaji bhavna bharat bhaskar bhavna bipin chandan chandni
    chetan deepa deepak deepti dev devesh devika dharmesh dhruv dinesh divya durga farhan gaurav gayatri geeta
    girish gopal govind harish harpreet hema himanshu inder isha ishaan jagdish jai jatin jaya jayant jayesh jyoti
    kajal kamal kamala kapil karan karishma kavita kiran kishan kishore krishna kriti kuldeep kunal lakshmi lalit
    lata madhav madhuri mahesh mala manish manisha manoj maya meena meera mohan monika mukesh naina nandini narayan
    naveen navin neelam neha nikhil nisha nitin pallavi pankaj pooja poonam pradeep prakash pranav prashant pratik
    preeti prem priya rahul raj rajan rajat rajeev rajesh rajiv rakesh rani ravi ravindra reena rekha rina ritesh
    rohan rohit sachin sameer sandeep sanjay sanjana santosh sapna sarita satish shalini shankar sharmila shashi
    shekhar shilpa shiv shiva shraddha shreya shruti siddharth simran sneha sonali sonia sudhir suman sunil sunita
    suresh swati tanvi tarun uma usha varun vijay vikash vikas vikram vinay vineet vinod vishal vivek yash
    abdul ahsan akhtar aleem alina amjad anas aqib arif asad asif atif ayaz azhar babar danish faisal farooq
    fawad hamza haris hina huma imran iqbal irfan junaid kashif khalid maheen mahira mansoor mariam mehreen mohsin
    muneeb nadia naeem nasir naveed nida omar qasim rabia raza rizwan saad saba sadia safia salman sana shazia
    shoaib sidra suhail sumaira tahir talha tanveer tariq umair usman waqar yasir zain zara
    abir adnan afrin anik anika anwar arif arman arpona bappa bipasha farhana fahim hasan jannat javed kabir lamia
    mahmud mamun mithila monir mousumi nahid nasreen nishat nusrat rakib rafiq rashed riya rubel sabrina sakib salma
    sharmin shuvo sumaiya tania tasnim touhid zubair
    amal asanka chamara chathura damith dilani dinuka eranga gayani harsha hasini isuru janaka kaushalya lakmal
    malini manoj nadeesha nalin nimal nirosha pradeep rangana roshan sachini sanduni shanika tharindu udari wajira
    anil asmita ayush binod bimal bishal dipak gita hari kabita kamal krishna laxmi manisha nabin nirmal prabin
    prakash puja ramesh sabina sagar sanjeev sarita sushil tika usha`,

    // Chinese romanizations (Mandarin, Cantonese and diaspora variants)
    `ai an bao bei bo cai chang chen cheng chih ching chun cong da dai dan dewei dong fang feng gang guang guo
    hai hao he heng hong hua huan hui jian jiang jie jin jing jun kai kang lan lei li lian liang lin ling long lu
    mei meng ming min nan ning peng ping qi qian qiang qiao qing quan ren rong ru shan sheng shi shu shuang song
    tao tian ting tong wei wen wu xi xia xian xiang xiao xin xing xiu xue yan yang yao yi yin ying yong yu yuan
    yue yun zhen zhi zhong zhou zhu zi
    ahlam alvin angela benny calvin carmen cheuk chi chiu choi chunwai fai fook ho ka kailun kam keung kin lai
    lok man mingwai pak po pui sai shuk sin sze tak waiyan wing yanming yat yiu yuk zhihao xiaoming weiming
    guangming guoqiang haitao hongwei jianguo jianhua jianguo jianjun jianming jianping jianwei jingyi junjie lei
    lijuan liming lina meiling qian ruolan shanshan tao weiwei wenjie xiaoli xiaoyan xin yi yifan yingying yongqiang
    yuchen zhiming`,

    // Japanese and Korean
    `aiko akane akemi akihiko akihiro akiko akira asami atsuko ayaka ayako ayumi chie chika chiyo daichi daisuke
    emi emiko eriko etsuko fumiko haruka haruki hayato hideaki hideki hikari hiro hiroaki hiroko hiroshi hitomi
    ichiro isamu itsuki jun junichi kaori kazuo kazuki kazuko keiko ken kenichi kenta kenji kimiko kiyoshi koichi
    kumiko maki makoto manabu mariko masahiro masaki masako masao masaru megumi michiko mika miki minako minoru
    misaki miyuki naoki naoko natsuki noboru noriko osamu reiko ren rika riku rina ryo ryota sachiko sakura satomi
    satoshi sayuri shin shinichi shiro shota taichi takashi takayuki takeshi takumi taro tomoko tomoya toshiko
    yasuhiro yasuko yoichi yoko yoshiaki yoshiko yoshio yuki yukiko yumi yusuke
    areum bora byungchul chaewon changmin daehyun daeun donghyun eunji eunjung geonwoo gyuri hana haneul hayoon
    heejin heesoo hyewon hyun hyunji hyunwoo jaehyun jaemin jisoo jihoon jihyun jimin jiwon jonghoon jongsoo
    junho junseo kyunghee kyungsoo minho minji minsik minsoo minyoung moonseok nari sanghoon seojun seokjin
    seoyeon seungmin soojin soomin sora sungmin taehyun taehoon woojin yejin yeonhee yeonsoo youngchul younghee
    youngho yuna yunseo`,

    // Vietnamese, Thai, Indonesian, Malaysian, Filipino, Burmese and Cambodian
    `anh bao bich binh chau chi cong cuong diem diep dung duy giang ha hai hanh hien hieu hoa hoai hoang hong
    huan hung huong khanh khoa khoi kien kieu lan linh loan loc long luan mai minh my nam nga ngan ngoc nguyet
    nhan nhi nhung pham phan phat phong phu phuc phuong quang quoc quy son tam tan thanh thao thi thien thu thuan
    thuy tien trang trinh trung tu tuan tuyet van vi viet vinh vy xuan yen
    achara anan anong apinya araya boonmee busaba chai chaiwat chatchai chayapol daranee jariya jirayut kanda kanya
    kittisak malee mali manit montri nattapong nawamin niran nonglak orathai patchara pichai pimchanok piyada
    prasert prasit preecha ratana sakchai siriporn somchai somporn somsak suda suchada supachai surasak tanawat
    thaksin thanakorn thida udomchai waranya wichai yongyut
    agus agung ahmad andi anisa arif budi cahya candra citra dewi dian dwi eka endang erna fajar fitri hendra
    indah intan irfan joko joko joko kartika lina mega muhammad nur putri rachma rahmat ratna reza rizky sari
    siti sri susanti taufik tri wahyu widya yanti yudi yulia yusuf zainal
    aisyah amirul azlan farah firdaus hafiz hakim hanif haziq izzat khairul nadia naim nazrin noraini nurul
    roslan syafiq syahirah wan zulkifli
    abigail adrian alden althea angelica antonio arnel bea benjie carlo carmelita cristina danilo edgar elena
    emmanuel ernesto francisca geraldine grace hazel janine jericho joanna josephine jun lorna lourdes luzviminda
    maribel maricel marites miguel myra noli paolo regina renato ricardo rosalinda rowena ruel teresita virgilio
    aung aye ei hla hnin khin kyaw ma maung min minthant moe myat myint nay nyein phyo soe su suwai than thant
    thein thiha thu tun win wyne zin
    borey botum bunthoeun chantha chenda dara davuth kanha khemara kimleng kosal malis monyneath piseth rathana
    samnang sitha sokha sophea sreyneang vanna veasna vibol`,

    // African traditions and widely used African names
    `abena abimbola abiodun abubakar adanna ade adebayo adebola adedayo adefemi adekunle ademola adenike adeola
    adesoji adwoa afia agyei akosua akua ama amaka amara amina anayo ayo ayodele babatunde bisi bolaji bose chidi
    chika chinedu chioma chukwuemeka dadae efua ekenna emeka enitan fatu folake funke gideon ifeanyi ifunanya ike
    ikechukwu isioma iyabo kehinde kelechi kofi kojo kwabena kwame makena nana ndidi ngozi nneka obinna olamide
    olufemi oluwaseun onyeka osaze selasi taiwo temitope tobi uche uzoamaka yetunde yewande yinka
    abdullahi abdi abdirahman abdirizak abshir ahmed ayaan cabdi deeqo farhiya fowsiya guled halima hodan ibrahim
    ilhan ismail khadra liban maryan mohamed mukhtar najma nimco sahra samira warsame yasmin yusuf
    abebe abel abera addis alem alemayehu amani amara ashenafi awet berhane bethel bezawit biruk dawit eden elias
    ermias eskinder eyerusalem feven frehiwot gebre genene getachew hana henok hiwot kalkidan kidist lemi lidya
    makda melaku meron mesfin mihret mulugeta nahom natnael rahel ruth samrawit selam selamawit senait solomon
    tariku teklu tesfaye tsega yonas yordanos zerihun
    abena adwoa akua ama araba asantewaa esi kyei kwesi nana yaw yoofi
    akinyi amina atieno awino baraka chebet chege cherono chepkirui chumba embet faith juma kamau kemei kemunto
    kigen kipchoge kipkemoi kiprono kirui lekeitio makena makori mbatha mbugua mutiso mwangi naliaka njeri njoki
    nyambura odhiambo okello omondi onyango otieno wafula wairimu wambui wangari wanjiku wekesa zuri
    amara amogelang andile ayanda bongani bongiwe boitumelo busisiwe dikeledi dumisani funani gugu kagiso karabo
    katlego khanyisile khaya lerato lindani lungelo mandisa mbalenhle melokuhle mpho naledi nkosazana nomsa noluthando
    nomvula nosipho ntombi oluwaseyi oratile palesa precious pula refiloe sandile sibusiso simphiwe siyabonga
    sipho sizwe thabo thandi thandeka thembeka theodore tshepo vumani zandile zanele zolani
    chipo farai fungai kudakwashe munashe nyasha rumbidzai rutendo simba simbarashe takudzwa tapiwa tatenda tendai
    tinotenda tinashe tongai
    amadou aminata awa babacar bineta cheikh coumba daouda diarra djibril fatou fatoumata ibrahima issa khady
    lamina mademba madiou mariama modibo moussa ndiaye ousmane rokaya salif seydou souleymane yacine yakouba`,

    // Extra real transliteration and spelling variants seen in multilingual records
    `abd-al-rahman abdelaziz abdulaziz abdulrahman abdurahman achmed aleksander aleksandr aliya alya ameer
    aysha bekir cemal djamal dmitrii dmytro ebru ewa georgios giorgi hamad hamidullah husein hussein hussain
    ismaila ivanna jozef khurram krzysztof lyudmila mahammad mahmoud mohamad mohammad muhamad muhamed
    muhammed muhammet muhammod muhammedali mustapha nikolaj nursultan oleksiy olena ousman peyami rachid rachida
    rania rasha roza saeed samy serhiy shamil sofija stefaniya suleiman sylwia tetyana viktoriya yevhenii yusef
    alexandru bill daan haruto hope jiwoo jurgen jan kavya lee may meilin minjun min-jun poppy sanne seo-jun
    seojun soren tanvir thandiwe will yuto`,
  ]);

  const last = unique([
    // British, Irish, North American and other Anglophone surnames
    `abbott adams adkins alexander allen allison andrews armstrong arnold atkins atkinson austin bailey baker baldwin
    ball banks barber barker barnes barrett barton bates baxter bell bennett benson berry bishop black blair blake
    bolton bond booth bowen boyd bradley brady breen brennan brewer brooks brown bryant buckley bullock burke burns
    burton butler byrne campbell carroll carter casey chambers chapman clark clarke clayton cole coleman collins
    connolly conway cook cooper cox craig crawford cross cunningham dalton daniels davidson davies dawson dean delaney
    dennis dixon doherty donnelly donovan douglas doyle drake duncan dunn edwards elliott ellis evans farrell ferguson
    fields fisher fitzgerald fleming fletcher flynn ford foster fox francis franklin fraser freeman frost fuller gallagher
    gardner garrett gibson gilbert gill glenn glover gordon graham grant gray green griffin hamilton hammond hardy harper
    harrington harris harrison hart harvey hawkins hayes henderson henry higgins hill hilton hodgson holland holmes
    hopkins horne houston howard hudson hughes hunt hunter ingram jackson james jenkins jennings johnson johnston jones
    jordan kane kelly kennedy kent kerr king knight lamb lambert lane lawrence lee lewis lindsay little lloyd long
    lowe lynch mackay mackenzie malone marsh marshall martin mason matthews maxwell may mccarthy mccormick mcdonald
    mcgrath mckay mckenna mckenzie mclean mcleod miles miller mills mitchell moore moran morgan morris morrison murphy
    murray nash nelson newman newton nicholson nolan norman obrien oconnell oconnor oneill osborne owen owens palmer
    parker patterson payne pearce pearson perry peters peterson phillips porter powell price quinn reed rees reid reynolds
    richards richardson riley roberts robertson robinson rogers rose ross rowe russell ryan sanders saunders scott
    sharp shaw simmons simpson smith spencer stanley steele stephens stevens stewart stone sullivan sutton taylor
    thomas thompson todd tucker turner walker walsh ward warren watson watts webb wells west wheeler white wilkinson
    williams williamson wilson winter wood woods wright young`,

    // Dutch and Flemish
    `aalbers aartsen abspoel alberts alkema almen amels ammerlaan arends bakker barends becker beek berg berge berger
    berk berkel beukers bezemer bijl blok bloem boer boersma bolt boon bos bosch bouman braak brand brands brouwer
    bruijn bruin buijs buuren claassen cornelissen corstjens dekker dekkers dijkstra dijkman doesburg dongen doorn
    drenth driessen eijk elsen engel engelen everts flier gaal geel geelen geerts gerrits giesen goossens graaf graauw
    groen groenen groot haan haas hak hartog haverkamp heemskerk heijden heijmans hendriks hermans hoek hoogenboom
    hout hulst huisman jansen janssen jonker jong jongh kaiser kamp kamphuis keizer kerkhoff ketelaar klaassen klein
    klok kok koning koopman koster kraai kuiper laan laar lang langendijk leeuwen lemmen linden loo maas martens meijer
    mees mertens molenaar mulder nelemans nieuwenhuis nijhof nijs oost oosten ottens paauw peeters pieters plomp post
    prins pronk raamsdonk reinders rietveld roelofs roos schenk schepers scholten schouten schuurman smit smits snijders
    spaan spek sprong stam steen steenbergen stevens timmer timmerman velde velden veen veenstra verbeek verhoeven
    vermeulen verschuur visser vliet vos vries waal waals werkman westerhof wever wijngaarden willems winter wolters
    wouters zandt zee zijlstra zwart`,

    // German, Austrian and Swiss
    `abel abraham ackermann adler albrecht arnold bach bachmann bader baer bartels baumann bayer beck becker behrens
    berger bergmann bock boehm brandt braun breuer brunner busch conrad degen deininger dietrich dorn eberhardt ebert
    eckert engel engelhardt ernst falk faust fiedler fischer frank franke franz freitag friedrich fritsch fuchs
    geiger geissler graf greiner gross gruber haas hahn hartmann hauser heine heinrich heinz held heller helm hermann
    herzog hess heyn holz huber jacobs jaeger jahn jung kaiser keller kern kiefer kirchner klein klose koch koehler
    koenig kraemer kraus krause krueger kuhn lange lang lechner lehmann lenz lindner lorenz ludwig maier mann marx
    mayer meier meyer moeller mueller neumann nickel otto peters pfeiffer pohl reuter richter roth sauer schaefer
    schiller schlegel schmid schmidt schmitz schneider scholz schreiber schroeder schubert schulte schulz schumacher
    schwarz seidel simon sommer stein steiner strauss thiel vogel vogt voigt wagner walter weber wegner weiss werner
    winkler winter wolf wolff ziegler zimmer zimmermann`,

    // French and Francophone
    `adam albert alexandre allard andre antoine arnaud aubert barbier baron barthelemy benard benoit berger bernard
    bertrand blanc blanchard bonnet boucher bouchet boulanger bourdon bourgeois bouvier breton brun caron carre carriere
    charpentier chevalier clement colin cordier coste cousin da silva daumas david delacroix denis deschamps dubois
    duchamp dufour dumas dumont dupont dupuis durand faure fernandez fleury fontaine fournier francois gaillard garnier
    gauthier gerard gilbert girard giraud gomez gonzalez guerin guillaume guyot hamon henry herve hoarau hubert jacquet
    jean joubert jourdan julien lacroix lambert laurent leclerc lecomte lefevre lemaire lemoine leroy lopez louis
    lucas maillard marchand marie marin martel martin martinez masson mathieu menard mercier meunier meyer michel
    millet monnier moreau moulin nicolas noel olivier paris pascal paul perrin petit philippe picard pichon pierre
    poisson prevost raymond remy renaud renault rey richard riviere robert robin roche rodriguez rolland rousseau
    roux roy simon thomas valentin verdier vincent`,

    // Spanish, Portuguese and Latin American
    `acosta aguilar alonso alvarez arias avila bautista benitez blanco bravo caballero cabrera campos cano cardenas
    carmona carrasco castillo castro cortes cruz delgado diaz diez dominguez duran espinoza esteban fernandez ferrer
    flores franco fuentes gallardo gallego garcia garrido gil gimenez godoy gomez gonzales gonzalez guerrero gutierrez
    guzman hernandez herrera hidalgo iglesias jimenez leon lopez lorenzo luna marin marquez martin martinez medina
    mendez mendoza molina montero montoya mora morales moreno moya munoz navarro nieto nunez ortega ortiz pacheco
    padilla paredes parra pastor pena perez prieto ramos rey reyes rios rivera robles rodriguez rojas roman romero
    rosales rubio ruiz saez salas salazar sanchez santana santiago santos sanz serrano silva soler soto suarez torres
    valdez valencia valero valls vega velasco vera vicente vidal villanueva zamora zapata
    almeida alves amorim andrade antunes araujo azevedo barros batista borges branco cabral campos cardoso carneiro
    carvalho castro coelho correia costa coutinho cruz cunha dias diniz domingues duarte esteves faria fernandes
    ferreira fonseca freitas gomes goncalves leite lemos lima lopes lourenco macedo machado magalhaes maia marques
    martins matos mendes monteiro mota moura nascimento neves nunes oliveira pacheco paiva pereira pinheiro pinto
    pires ramalho ramos reis rezende ribeiro rocha rodrigues rosa sa sousa tavares teixeira viana vieira`,

    // Italian and Greek
    `abate alberti amato ambrosini andreotti angelini antonelli barone bartoli bassi battaglia bellini benedetti bernardi
    bianco bianchi brunetti bruni carbone caruso catalano cattaneo colombo conti coppola costa damico deangelis
    demarco derossi donati esposito fabbri farina ferrara ferrari ferretti fiore fontana galli gallo gentile giordano
    giuliani grassi greco leone lombardi longo mancini mariani marino martini martino mazza messina monti moretti
    moro napolitano neri orlando palumbo parisi pellegrini pellegrino perrone piazza pisani poli ricci rizzo romano
    rossetti rossi russo sala santoro sartori serra silvestri sorrentino testa tosi valenti villa vitale
    alexandris angelopoulos antoniou athanasiou christodoulou christou demetriou dimitriou georgiou giannakopoulos
    ioannidis ioannou karagiannis karalis karamanlis karas konstantinidis kostopoulos kyriakou lambrou makris manolis
    mavridis nikolaidis oikonomou panagopoulos panagiotou papadakis papadopoulos papageorgiou papanikolaou pavlidis
    petrou samaras sotiropoulos spyropoulos stavrou theodorakis theodorou triantafyllou vassiliou vlachos zervas`,

    // Nordic, Finnish, Icelandic and Baltic
    `andersson andreassen berg berglund blom carlsson christensen clausen dahl danielsen eriksen frederiksen friberg
    hansen hansson haugen hedberg henriksen holm jakobsen jensen johansen johansson jonassen jonsson karlsson knudsen
    kristensen larsen larsson lindberg lund lundberg madsen magnusson martinsen mathisen mikkelsen nilsen nilsson
    nordin nygaard olsen persson petersen rasmussen rosenberg sandberg simonsen skovgaard strom svendsen sorensen
    thomsen viklund
    aalto ahonen antikainen hamalainen hanninen heikkinen heinonen helminen hiltunen hirvonen hokkanen holopainen
    huhtala jarvinen jokinen jokela kallio karjalainen kauppinen kemppainen kinnunen koivisto korhonen koskinen
    laakso laine laitinen lehtinen lehto leinonen leppanen makela manninen mattila miettinen mustonen makinen nieminen
    niskanen nurmi oksanen partanen peltonen rantanen rasanen salminen savolainen seppala suominen tuominen virtanen
    ahlberg eklund ekstrom granlund gustafsson hallberg holmberg lindgren lindholm lundgren nystrom sjoberg stromberg
    svanberg wallin
    arnason arnadottir bjarnason bjarnadottir einarsson einarsdottir eriksson eriksdottir gudmundsson gudmundsdottir
    gunnarsson gunnarsdottir haraldsson haraldsdottir helgason helgadottir johannsson johannsdottir jonsson jonsdottir
    kristjansson kristjansdottir magnusson magnusdottir olafsson olafsdottir sigurdsson sigurdardottir stefansson
    stefansdottir thorsteinsson thorsteinsdottir
    tamm saar sepp kask mae mets kuusk raud lepik tammekivi kalnins berzins ozols liepa balodis jansons zalitis
    kazlauskas jankauskas petrauskas stankevicius paulauskas zukauskas butkus urbonas navickas`,

    // Polish, Czech, Slovak and Hungarian
    `adamczyk adamski baran baranski bialek bielecki blaszczak borowski chmielewski czajka czarnecki dabrowski dudek
    dziuba grabowski gorski jakubowski jankowski jasinski jaworski kaminski karpinski kasprzak kolodziej kowal
    kowalczyk kowalski kozak kozlowski krajewski krupa krzyzanowski kucharski kwiatkowski lewandowski lis majewski
    makowski malinowski marciniak mazur michalak michalski mroz nowak nowakowski ostrowski pawlak pawlowski piotrowski
    przybylski rutkowski sawicki sikora sobczak sokolowski stasiak szczepanski szymanski tomaszewski urbanski walczak
    wieczorek wilk wisniewski wojciechowski wojcik wozniak wysocki zajac zalewski zielinski zuchowski
    benes blaha cermak cerny dvorak fiala hajek hampl havel holub horak hruby janda janousek kadlec klima konecny
    kral krejci kratochvil kubik kucera mach marek martinek masek matousek navratil nemec novak novotny pokorny
    pospisil prochazka ruzicka sedlak skala soukup spacek svoboda urban vacek vesely vlcek zeman
    balaz bartos benko blasko danis dubravsky duris farkas ferenc gajdos gal gonda horvath hudak chovanec kovac
    kovacs kralik kubik lukac molnar nagy nemeth oravec paulik polak simon slovak svec varga
    balogh ban barta biro bodnar bogdan boros deak farkas fazekas feher fekete fodor gulyas hajdu halasz hegedus
    horvath juhasz kardos katona kiss kovacs lakatos lukacs magyar meszaros molnar nagy nemeth orban pap papp
    rakosi sandor simon szabo szalai szekely takacs toth varga vereb`,

    // Romanian, Bulgarian, South Slavic and Albanian
    `albu alexandrescu andrei anghel anton ardelean avram baciu balan barbulescu bogdan bratu bucur caraman chiriac
    ciobanu cojocaru constantin craciun cristescu cristea damian dan dragomir dumitrescu ene filip florescu gheorghe
    grigore ilie ion ionescu irimia lazar luca lupu marin marinescu matei maxim mazilu mihai mocanu moldovan munteanu
    neagu nistor oprea paun pop popa popescu radu rotaru sandu serban stan stoica tudor ungureanu ursu vasile
    alexandrov angelov asenov atanasov boev borisov botev dimitrov donchev georgiev grigorov hristov iliev ivanov
    kolev kostov kovachev krastev markov mihaylov mladenov nikolov pavlov petkov popov rusev slavov stoyanov todorov
    tsonev vasilev vladimirov yanev yankov zahariev
    babic basic begic blazevic bogdanovic bosnjak brankovic cobanovic colic djordjevic djuric filipovic ilic ivanovic
    jankovic jovanovic juric knezevic kovac kovacevic krstic lukic mandic markovic martic matijevic milic milosevic
    nikolic novakovic pavic pavlovic peric petrovic popovic radic radovanovic simic stojanovic tomic vasic vidic
    vukovic zoric
    berisha bytyqi dervishi gashi gjoka hoxha kadriu kapllani kastrati kola krasniqi kryeziu kurti lama mehmeti
    murati mustafa rexhepi selimi shala shehu tahiri ukaj zeqiri`,

    // Russian, Ukrainian, Belarusian, Georgian and Armenian
    `abramov aleksandrov alexandrov andreev antonov baranov belov bogdanov bondarenko borisov bykov chernov
    danilov davidov denisov dmitriev egorov fedorov filatov fokin fomin gerasimov golubev grigoriev gromov gusev
    ilyin isaev ivanov kalinin karpov kazakov kiselev klimov komarov konovalov korolev kovalev kozlov kruglov
    krylov kudryavtsev kuznetsov lebedev makarov maksimov malyshev maslov matveev medvedev melnikov mironov morozov
    nikitin nikolaev novikov orlov osipov panov pavlov petrov polyakov popov romanov rybakov semenov sergeev smirnov
    sobolev sokolov soloviev sorokin stepanov tarasov titov tsvetkov vasilev vinogradov vlasov volkov vorobiev yakovlev
    zaitsev zakharov zhukov
    bondar bondarenko boyko havryliuk holub honchar horbunov ivanenko ivashchenko koval kovalenko kravchenko kovalchuk
    kozachenko kushnir levchenko lysenko marchenko melnyk moroz oliinyk oleksiyenko petrenko polischuk romanenko
    savchenko shevchenko sidorenko tkachenko tsygankov volkova zahorodniuk
    baranouski bykau hlushko karpenka kavalenka kazlou kruk makarevich mironchyk paulovich savitski shauchenka
    abashidze beridze bolkvadze chkhikvadze chubinidze dvali gaprindashvili gelashvili gogoladze gorgadze gvaramia
    iashvili ioseliani japaridze kalandadze kapanadze kavtaradze kiknadze kobakhidze lomidze maisuradze mamulashvili
    meladze nadiradze namoradze nikuradze razmadze shengelia sikharulidze tabidze tsiklauri tsulukidze
    abrahamyan arakelyan avagyan avetisyan babayan badalyan danielyan davtyan galstyan gasparyan gevorgyan
    grigoryan hakobyan harutyunyan hovhannisyan khachatryan kirakosyan manukyan margaryan martirosyan melikyan
    mkrtchyan muradyan petrosyan poghosyan sargsyan simonyan stepanyan vardanyan yeghiazaryan zakaryan`,

    // Arabic, North African, Turkish, Persian, Kurdish and Central Asian
    `abbas abdallah abdalla abdelaziz abdelrahman abdulrahman abdullah abouzeid adel ahmad ahmed akhtar al-amin
    al-hassan al-masri al-sayed alam ali amari amin anwar assad awad aziz badawi bakr barakat bashir benali benamar
    benyoussef bouazizi boumediene boutaleb chahine chami darwish deeb eid elamin elfassi elmasry fadel fahmy farah
    farhat farouk ghali ghanem habib haddad hadi hafiz hakim halabi hamad hamdan hamed hamid hammoud hamza harb
    hassan hatem hijazi hossain hussein ibrahim idris iskandar ismail jaber jabri jalal jalloh jamil kabir karam
    karim khaled khalil khan khoury mansour masri mehdi mikhail mohamed mohammad mohammed mubarak moussa mustafa
    nabil nader najjar nasr nasser omar othman qasim rahal rahman rashid saad sabbagh sabri said saleh salim samad
    samir shami sharif sultan taha taleb tamimi tariq wahba yacoub yahya yasin younis yousef yusuf zaher zaki
    aksoy akyol arslan aslan atalay aydin ayhan bakir balci basar bayrak cetin celik demir deniz dogan durmaz erdem
    erdogan eren gok guler gunes gungor guney kaplan kara karaca karadag karaman kaya keskin kilic koc korkmaz kurt
    mutlu ozcan ozdemir ozkan polat sahin sari selcuk sen simsek tas tekin topal turan ulusoy uzun varol yalcin
    yildirim yilmaz yurt
    abbasi ahmadi akbari amini ansari asadi azadi bahrami bakhtiari darvishi ebrahimi emami farahani faraji fathi
    ghasemi golami habibi hassani heydari hosseini jafari jalali karimi kazemi khademi khosravi mahdavi maleki
    masoumi mirzaei moradi mousavi najafi naseri norouzi pourali rahimi rajabi ramezani rezaei rostami sadeghi
    safavi salehi shafiei sharifi shirazi soleimani taheri tavakoli yazdani zadeh zarei
    abdullayev abiyev akhmetov aliyev asanov baigaliyev bekov dosov isayev karimov kasymov khan nadirov nabiyev
    nurmagambetov omarov orynbayev rakhimov saidov sadykov saparov serikbayev suleimenov tursunov usmanov yusupov`,

    // South Asian surnames
    `acharya agarwal aggarwal ahluwalia ahuja anand arora arya awasthi bajaj bakshi balakrishnan banerjee bansal
    barua basu batra bhagat bhalla bharadwaj bhardwaj bhargava bhat bhatia bhattacharya biswas bose chakrabarti
    chakraborty chandran chatterjee chauhan chavan choudhary chowdhury das dasgupta datta desai deshmukh dev dhar
    dhawan dubey dwivedi gandhi ganguly ghosh goel goswami gowda guha gupta iyer jain jaiswal jha joshi kapoor kapur
    kar khanna khare khurana kohli kulkarni kumar kurian mahajan mahato malhotra malik mandal mathur mehra mehrotra
    menon mishra misra mittal mukherjee naidu nair narang narayan nath nayak pandey parekh patel patil pillai prasad
    purohit raghavan rai rajan rajput rana rao reddy roy sahu saini saxena sehgal sen seth shankar sharma shukla
    singh sinha sodhi srivastava subramanian thakur tiwari trivedi tripathi varma verma vyas wadhwa yadav
    abbasi afzal ahmed akhtar ali ansari asghar awan azam baig bhatti bokhari butt chaudhry dar durrani farooqi
    gilani gul hamid hashmi hussain iqbal jahangir jamil khan khokhar lodhi mahmood malik masood mirza moghal mughal
    naqvi nasir nawaz niaz pasha qureshi raza rehman rizvi saeed shah shaikh sheikh siddiqui soomro syed tariq
    usmani zaidi zaman
    ahsan akter alam bhuiyan biswas chowdhury haque hasan hossain islam kabir karim khatun mahmud mia mollah miah
    mondal rahman sarkar talukder
    adhikari basnet bhandari bhattarai dahal gautam ghimire gurung khadka karki kc lama magar maharjan neupane
    pandit poudel pradhan rai rana regmi shahi sharma sherpa shrestha subedi tamang thapa
    abeysekera bandara de-alwis de-silva dissanayake fernando gunasekara herath jayasinghe karunaratne kumara
    munasinghe pathirana peiris perera rajapaksa ranasinghe samarasinghe senanayake silva wickramasinghe`,

    // Chinese surnames and common romanization variants
    `ai an ao bai bao bi bian bian bo bu cai cao cen chai chang chao chen cheng chi chiu chong chou chu cui dai
    deng ding dong dou du duan fan fang fei feng fu gan gao ge geng gong gu guan guo han hao he heng hong hou hu
    hua huang hui huo ji jia jiang jiao jin jing kang ke kong kuang lai lan lei li lian liang liao lin ling liu
    long lou lu luan luo ma mai mao meng mi miao min mo mu ni nie ning ou pan pang pei peng pi piao ping qi qian
    qiang qiao qin qiu qu quan ren rong ruan shan shao shen sheng shi shu song su sun tan tang tao tian tong tu wan
    wang wei wen wu xi xia xian xiang xiao xie xin xing xiong xu xue yan yang yao ye yi yin ying yong you yu yuan
    yue yun zang zeng zhai zhan zhang zhao zhen zheng zhong zhou zhu zhuang zhuo zi zou zuo
    chan cheung chow chuang fan fong fung ho hsu hsueh huang kwan kwok lai lam lau law leong leung lim lo lok luk
    mak mok ng ouyang sze tam tong tsai tse tseng wan wong woo yam yap yee yeung yim yip yiu yu
    chen lee liu wang yang zhang zhao wu zhou xu sun ma zhu hu guo he gao lin luo zheng liang xie song tang han
    feng yu dong xiao cheng cao yuan deng xu fu shen zeng peng lu su jiang cai jia ding wei xue ye yan du dai xia`,

    // Japanese and Korean surnames
    `abe adachi aoki arai arakawa araki asano baba chiba doi endo fujii fujimoto fujita fujiwara fukuda goto hara
    harada hashimoto hayashi honda hori horiuchi hoshi ichikawa ide igarashi ikeda imai inoue ishida ishii ishikawa
    ito iwata kaneko kato kawai kawakami kawamura kawasaki kida kikuchi kimura kishimoto kobayashi koda kojima
    kondo konishi kubo kubota kudo kurita maeda maruyama matsuda matsui matsumoto matsushita miura miyake miyamoto
    mori morimoto morita murakami murata nagai nagata nakagawa nakajima nakamura nakano nakata nakayama nishimura
    nishiyama noda noguchi ogawa ohashi okada okumura ono ota oyama saito sakai sakamoto sasaki sato shibata shimizu
    suzuki takada takagi takahashi takeda tamura tanaka tani toyoda ueda ueno uchida watanabe yamada yamaguchi
    yamamoto yamashita yano yokoyama yoshida
    ahn bae baek bang byun cha chang cho choe choi chun do gang go gong gu gwak ha han heo hong hwang hyun im jang
    jeon jeong ji jin jo jung kang kim ko koo kwon lee lim min moon na nam noh oh pak park rhee ryu seo seok shin
    sim song son sung yang yeo yoo yoon yu`,

    // Vietnamese and Southeast Asian surnames
    `bui cao chau dang dinh do duong ha ho hoang huynh lam le luong ly mai ngo nguyen pham phan phung quach ta
    thai thanh tran trinh truong vu vo
    adulyadej anan amornchai boonmee boonma boonrod chaiprasit chaiyaporn charoen chatchai intarawong kaewprasert
    kamol kittisak kongkaew kulap na-nakhon nimsakul phanich prachak pramoj rattanakul saelim saksit siriporn
    somboon somchai srisai sukanya suwannarat tangtrongchit thanomchai thongchai wongchai yindee
    abdullah adnan ahmad akbar amir anwar arif aziz basri bin-ali binti-ali chandra darmawan fauzi gunawan hadi
    hakim halim hamzah harahap hartono hasan hidayat ibrahim iskandar jaya kartono kusuma lim mahmud malik mat
    maulana nasir nawawi nugroho permana pratama putra rahman ramli rasjid santoso saputra setiawan siregar soekarno
    subroto sudirman suharto surya tan tjandra wahid wijaya yanto yusof zainuddin
    abalos agbayani aguilar aquino bautista cabrera castillo castro cruz dela-cruz de-leon diaz domingo espiritu
    evangelista flores francisco garcia gonzaga gutierrez hernandez lim macapagal magsaysay manalo manansala mendoza
    mercado navarro pangilinan pascual ramos reyes roxas santos sarmiento soriano tan tolentino torres valdez villanueva
    win aung hla kyaw maung min myint naing oo phyo soe than thein thu tun wai win zaw
    chan chea chhay chhim chhun heng hok keo khim kim kong lim long ly men neang ouk pen phan pheng prum ros roth
    sam san seng sok som suon tep touch uk vann yim`,

    // African surnames
    `abubakar achebe adebayo adekunle adeleke adeniyi adesina adeyemi agyapong akande akintola akpan akuffo amadi
    amankwah anang anene asante ashong ayodele azikiwe babangida balogun banda biko boateng bosompem chibueze
    chibuike chidozie chigbo chikezie chukwu chukwuma dlamini ebere edem ekong enwezor esien essien etim eze
    ezeani falana fashola fawole gyasi igwe iheanacho ike ikechukwu iwu james konadu koroma kwame lamptey mahama
    mensah mogae nkrumah nkwocha nnadi nwachukwu nwankwo nwosu obasi obi obinna obioha ogbonna ogunleye okafor
    okeke okoro okoye oladipo olatunji olawale olusegun onuoha opoku osagie osei otieno owusu sanusi sesay sow
    taiwo uche umar yeboah
    abdi abdullahi abukar aden ahmed ali barre dahir duale elmi farah gabow geedi guled hassan ibrahim jama liban
    mohamed mohamud noor nur osman robbow said samatar sharmarke warsame yusuf
    abate abebe alemu assefa awoke ayana ayele bekele berhane desta gebre gebremariam gebreselassie gebru girma
    haile hailemariam kassahun kebede lemma mekonnen mengistu mesfin negash redi seyoum tadese tafari tefera tesfaye
    wolde woldemariam yohannes zenawi
    abdalla abdelrahman adam aguer ajak akol alier bol deng garang gatluak kuol lual mabior machar majak malual
    manute nyandeng riak ring ruai taban yak
    chebet chege cheruiyot gikonyo gitau kamau kariuki kemei kemboi kigen kimani kipchoge kipkoech kipkorir
    kiprotich kirui kiplagat kosgei macharia maina mburu mbugua morara muchoki mugambi muriithi mutua mwangi ngugi
    njenga njogu njoroge nyongesa odhiambo ogola okafor okello okoth omondi onyango otieno rotich wafula wainaina
    wakaba wambua wanjiru were
    abrahams botha brits burger coetzee de-beer de-jager de-klerk de-villiers du-plessis du-toit erasmus fourie
    hattingh jacobs kruger le-roux lombard malan marais maritz mostert naude nel nieman oosthuizen pieterse pretorius
    prinsloo rademeyer rossouw roux smuts snyman steyn strydom swart theron van-der-merwe van-der-westhuizen van-wyk
    vermaak visagie venter viljoen
    chigova chikwava chirimuuta chitando chivasa dhliwayo dzamara gumbo gwenzi hove hunzvi kadenge karekezi
    katsande madondo makoni mangwiro mapfumo masakadza matsikenyeri mawere mbofana mchunu moyo mponda msipa mugabe
    munetsi mutsvangwa ndlovu nhamo njovu nyathi sibanda sigauke tsvangirai zuma`,

    // Additional common global spellings and transliterations
    `abd-alrahman abd-elrahman abdul-rahman al-husseini al-khatib al-mansour al-qahtani al-saud el-sayed elsayed
    ben-said bou-saida da-costa da-silva de-oliveira del-toro dos-santos el-haddad van-den-berg van-der-meer
    van-dijk van-leeuwen von-braun von-keller mcgee mcgill mcguire mclaughlin macdonald macgregor o-brien o-neill
    o-reilly chernyshov dostoievsky dostoevsky gorbachev gorbachov kovalyov kovalev krushchev khrushchev
    tchaikovsky chaikovsky yeltsin jeltsin zhukovsky zukovsky aliyev abdullayev gadzhiyev hasanov huseynov mamedov
    mehmedov muhammedov rasulov shiriyev suleymanov taghiyev yusifov zeynalov dijk nielsen al-farsi al-rashidi
    alfarsi alrashidi amrani ellison horst kristiansen lindqvist muller ostergard ostergaard pemberton whitfield wisniewska`
  ]);

  return { first, last };
})();
