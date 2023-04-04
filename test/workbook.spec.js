/* This is part of RO-Crate-excel a tool for implementing the DataCrate data packaging
spec.  Copyright (C) 2020  University of Technology Sydney

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* Test for workbook.js */

const fs = require('fs-extra');
const rocrate = require('ro-crate');
const RoCrate = rocrate.ROCrate;
const Workbook = require("../lib/workbook.js");
const assert = require("assert");
const chai = require('chai');
const expect = chai.expect;    

// Fixtures
const metadataPath = "test_data/sample/ro-crate-metadata.json";
const IDRC_metadataPath = "test_data/IDRC/ro-crate-metadata.json";


describe("Create a workbook from a crate",  function() {

  it("Should create a workbook with just one sheet", async function() {
    this.timeout(5000); 
    const c = new RoCrate({array: true, link: true});
    c.name = "Test"

    const workbook = new Workbook({crate: c});
    await workbook.crateToWorkbook();
    const sheet = workbook.workbook.getWorksheet("RootDataset");
    console.log(sheet.getCell("A1").value, sheet.getCell("A2").value, sheet.getCell("A3").value, sheet.getCell("A4").value)
    assert.equal(
      sheet.getCell("A1").value,
      "Name"
    );
    assert.equal(
        sheet.getCell("B1").value,
        "Value"
      );
      assert.equal(
        sheet.getCell("A2").value,
        "@id"
      );
      assert.equal(
          sheet.getCell("B2").value,
          "./"
        );


  });


  it("Should create a workbook with one sheet and some metadata", async function() {
    this.timeout(5000); 

    const c = new RoCrate();
    c.index();
    const root = c.getRootDataset();
    root["name"] =  "My dataset";
    root["description"] =  "Some old dataset";
    const workbook = new Workbook({crate: c});
    await workbook.crateToWorkbook();
    const rootSheetName = "RootDataset";
    datasetItem = workbook.sheetToItem(rootSheetName);
    assert.equal(Object.keys(datasetItem).length, 4)
    assert.equal(datasetItem.name, "My dataset");
    assert.equal(datasetItem.description, "Some old dataset");
   
  });


  it("Should create a workbook with two sheets", async function() {
    this.timeout(5000); 

    const c = new RoCrate();
    c.index();
    const root = c.getRootDataset();
    root["name"] =  "My dataset";
    root["description"] =  "Some old dataset";
    c.addItem({
        "@id": "https://ror.org/03f0f6041",
        "name": "Universtiy of Technology Sydney",
        "@type": "Organization"
    })
    const workbook = new Workbook({crate: c});
    await workbook.crateToWorkbook();
    // This is not using the api - may be fragile
    assert.equal(workbook.workbook["_worksheets"].length, 4, "There are only two sheets");


  });

  it("Should handle the sample dataset", async function() {
    this.timeout(5000); 

    var c = new RoCrate(JSON.parse(fs.readFileSync(metadataPath)));
    c.index();
    
    const workbook = new Workbook({crate: c});
    await workbook.crateToWorkbook();
    //console.log(workbook.excel.Sheets)
    assert.equal(workbook.workbook["_worksheets"].length, 17, "16 sheets")

    workbook.workbook.xlsx.writeFile("test.xlsx");
    const root = workbook.sheetToItem("RootDataset");
    assert.equal(root.publisher, `"https://ror.org/0384j8v12"`)
    expect(root.hasPart).to.deep.equal([`"lots_of_little_files/"`, `"pics/"`])

    // Name indexing works
    workbook.indexCrateByName();
    const pt = workbook.getItemByName("Peter Sefton")
    assert.equal(pt.name, "Peter Sefton")
    
    const items = workbook.sheetToItems("@type=Person");
    assert.equal(items.length, 1);
    assert.equal(items[0].name, "Peter Sefton");

  });


  it("Should handle the the IDRC (Cameron Neylon) dataset", async function() {
    this.timeout(5000); 
    const excelFilePath = "METADATA_IDRC.xlsx";
    var c = new RoCrate(JSON.parse(fs.readFileSync(IDRC_metadataPath)));
    c.index();
    
    const workbook = new Workbook({crate: c});
    await workbook.crateToWorkbook();
    //console.log(workbook.excel.Sheets)
    //assert.equal(workbook.workbook["_worksheets"].length, 15, "14 sheets")

    await workbook.workbook.xlsx.writeFile(excelFilePath);
    
    const workbook2 = new Workbook();
    await workbook2.loadExcel(excelFilePath);
    // Check all our items have survived the round trip
    //fs.writeFileSync("test.json", JSON.stringify(workbook2.crate.getJson(), null, 2));
    //console.log(workbook.crate.getRootDataset())
    for (let item of workbook2.crate.getGraph()) {
      if(item.name) {
        assert.equal(item.name, workbook.crate.getItem(item["@id"]).name)
      }
    }
    assert.equal(workbook.crate.getGraph().length, workbook2.crate.getGraph().length);

   
  });

  /* it("Can extract data from individual sheets", async function() {
    this.timeout(5000); 
    const excelFilePath = "METADATA_IDRC.xlsx";
    var c = new RoCrate();
    c.index();
    
    const workbook = new Workbook({crate: c});
    await workbook.crateToWorkbook();
    //console.log(workbook.excel.Sheets)
    //assert.equal(workbook.workbook["_worksheets"].length, 15, "14 sheets")

    await workbook.workbook.xlsx.writeFile(excelFilePath);
    
    const workbook2 = new Workbook();
    await workbook2.loadExcel(excelFilePath);
    // Check all our items have survived the round trip
    //fs.writeFileSync("test.json", JSON.stringify(workbook2.crate.getJson(), null, 2));
    //console.log(workbook.crate.getRootDataset())
    for (let item of workbook2.crate.getGraph()) {
      if(item.name) {
        assert.equal(item.name, workbook.crate.getItem(item["@id"]).name)
      }
    }
    assert.equal(workbook.crate.getGraph().length, workbook2.crate.getGraph().length);

   
  }); */

  it("Can resolve double quoted references", async function() {
    var c = new RoCrate({array: true, list: true});
    


    c.addEntity({"@id": "#test1", name: "test 1"});
    c.addEntity({"@id": "#test2", name: "test 2"});
    c.addEntity({"@id": "#test3", name: "test 3"});
    c.addEntity(  {
        "@id": "#test4", 
        name: "references",
        author: `"#test1"`, //By ID
        publisher: `"test2"`, // BY ID minus #
        contributor: `"test 3"` // By name
      }
    )
    const workbook = new Workbook({crate: c});
    await workbook.crateToWorkbook();
    workbook.resolveLinks();
    const item4 = workbook.crate.getEntity("#test4")
    console.log(item4.author)
    assert.equal(item4.author[0]['@id'], "#test1");
    assert.equal(item4.publisher[0]['@id'], "#test2");
    assert.equal(item4.contributor[0]['@id'], "#test3");
 
});


it("Can deal with extra context terms", async function() {
  var c = new RoCrate();
  c.index();

  c.getJson()["@graph"].push(
    {
      "@type": "Property",
      "@id": "_:myprop",
      "label": "myProp",
      "comment": "My description of my custom property",
      })
    c.getJson()["@graph"].push(
      {
        "@type": "Property",
        "@id": "_:http://example.com/mybetterprop",
        "label": "myBetterProp",
        "comment": "My description of my custom property",
      })
  c.getJson()["@context"].push({ 
    myProp: "_:myprop",
    myBetterProp: "_:http://example.com/mybetterprop"
  }
  )

  
  const workbook = new Workbook({crate: c});
  await workbook.crateToWorkbook();
  await workbook.workbook.xlsx.writeFile("test_context.xlsx");

  const contextSheet = workbook.workbook.getWorksheet("@context")
  expect(contextSheet.getRow(4).values[1]).to.equal("myBetterProp");
  expect(contextSheet.getRow(4).values[2]).to.equal("_:http://example.com/mybetterprop");

  
  
});




  it("Can export a workbook to a crate", async function() {
    this.timeout(5000); 

    var c = new RoCrate(JSON.parse(fs.readFileSync(metadataPath)), {array: true, link: true});
    const graphLength = c.toJSON()["@graph"].length;
    const workbook = new Workbook({crate: c});
    await workbook.workbook.xlsx.writeFile("test-this.xlsx");

    await workbook.crateToWorkbook();
    
    await workbook.workbookToCrate();
    console.log(JSON.stringify(workbook.crate.toJSON(), null, 2));
    expect(workbook.crate.toJSON()["@graph"].length).to.eql(graphLength);

    
});


it("Can handle mixed languages and various kinds of cell value", async function() {
  this.timeout(5000); 
  const catalogPath = "test_data/mixed_lg/ro-crate-metadata.xlsx";
  const wb = new Workbook();     
  await wb.loadExcel(catalogPath);
  // Start with a crate from a spreadsheet
  sourceCrate = wb.crate;
  const item = sourceCrate.getItem("ConcessionHealthCareCard/13655-1706ar.pdf")
  console.log(item.name);
  expect(item.name[0]).to.equal("وبطاقات الرعاية الصحية(بطاقات التخفيض)  Concession");
  const root = sourceCrate.getRootDataset();

  expect(root.datePublished[0]).to.equal("2022-01-10");
  expect(root.testProp[0]).to.equal("وبطاقات الرعاية الصحية(بطاقات التخفيض)  Concession");
  expect(root.SUM[0]).to.equal("5");

  expect(root.REFS[0]).to.equal("5Dataset");
  
});


});





